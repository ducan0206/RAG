"""
API Routes:

  POST   /api/ingest/stream                    SSE: pipeline progress + stats
  GET    /api/conversations                     sidebar history (grouped)
  GET    /api/conversations/{id}/messages       full conversation messages
  DELETE /api/conversations/{id}                delete conversation
  POST   /api/chat/{conversation_id}            Q&A (persisted to JSON)
  DELETE /api/chat/{conversation_id}/history    clear in-memory LLM history
  GET    /api/chunks/{conversation_id}          paginated chunk preview
  GET    /api/system/vram                       real VRAM from Ollama
  GET    /api/system/health                     Ollama connection status
"""

import asyncio
import json
import os
import shutil
import tempfile
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config.config import Config
from app.core.ingestion import DataIngestor
from app.core.database import VectorManager
from app.core.engine import RAGEngine
from app.utils.system_monitor import get_vram_info, is_ollama_running
from app.db import store   #  singleton JSONStore

router = APIRouter(prefix="/api")
_cfg   = Config()

#  In-memory engine registry: conversation_id  RAGEngine 
_engines: dict[str, RAGEngine]      = {}
_vms:     dict[str, VectorManager]  = {}


def _get_vm(conv_id: str, persist_dir: str) -> VectorManager:
    if conv_id not in _vms:
        vm = VectorManager(persist_dir=persist_dir, embed_model=_cfg.embed_model)
        if os.path.exists(persist_dir) and os.listdir(persist_dir):
            vm.load_db()
        _vms[conv_id] = vm
    return _vms[conv_id]


def _get_engine(conv_id: str) -> RAGEngine:
    if conv_id not in _engines:
        raise HTTPException(status_code=404, detail="Conversation not in active session.")
    return _engines[conv_id]


#  SSE helper

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


#  POST /api/ingest/stream 

@router.post("/ingest/stream")
async def ingest_stream(file: UploadFile = File(...)):
    """
    Upload PDF  SSE pipeline progress.
    On completion: creates conversation entry in data.json.

    SSE Events:
      progress  { step, label, detail, index, total_steps }
      ready     { conversation_id, title }
      stats     { total_elements, total_chunks, pages_processed, tables, images, texts }
      error     { message }
    """
    conv_id     = str(uuid.uuid4())
    persist_dir = os.path.join(_cfg.persist_dir, conv_id)
    filename    = file.filename or "upload.pdf"

    suffix   = os.path.splitext(filename)[1] or ".pdf"
    tmp      = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    finally:
        tmp.close()

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def on_progress(event: dict) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, ("progress", event))

    async def run_pipeline() -> None:
        try:
            #  Partition + chunk 
            ingestor = DataIngestor(model_vision=_cfg.vision_model)
            docs, stats = await loop.run_in_executor(
                None, lambda: ingestor.process_pdf(tmp_path, on_progress=on_progress)
            )

            #  Vectorize 
            await queue.put(("progress", {
                "step": "vectorize", "label": "Vectorization",
                "detail": f"Embedding {len(docs)} chunks into ChromaDB...",
                "index": 4, "total_steps": 6,
            }))

            vm = VectorManager(persist_dir=persist_dir, embed_model=_cfg.embed_model)
            await loop.run_in_executor(None, lambda: vm.create_db(docs))

            _vms[conv_id]     = vm
            _engines[conv_id] = RAGEngine(vector_manager=vm, model_name=_cfg.llm_model)

            await queue.put(("progress", {
                "step": "vectorize", "label": "Vectorization",
                "detail": f"Stored {len(docs)} vectors",
                "index": 4, "total_steps": 6,
            }))

            #  Save to JSON 
            store.create_conversation(conv_id, filename, persist_dir)
            store.update_stats(conv_id, stats)

            #  Ready 
            await queue.put(("progress", {
                "step": "ready", "label": "Ready",
                "detail": "Pipeline complete  ready to chat!",
                "index": 5, "total_steps": 6,
            }))
            await queue.put(("ready", {"conversation_id": conv_id, "title": filename}))
            await queue.put(("stats", stats))

        except Exception as exc:
            await queue.put(("error", {"message": str(exc)}))
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            await queue.put(None)

    async def event_generator() -> AsyncGenerator[str, None]:
        asyncio.create_task(run_pipeline())
        while True:
            item = await queue.get()
            if item is None:
                break
            event_type, payload = item
            yield _sse(event_type, payload)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


#  GET /api/conversations 

@router.get("/conversations")
async def list_conversations():
    """Sidebar history grouped: Today / Yesterday / Last 30 Days."""
    return store.list_conversations_grouped()


#  GET /api/conversations/{id}/messages 

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """Load full message history + restore in-memory engine for continued chat."""
    conv = store.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Restore engine if server was restarted
    if conversation_id not in _engines:
        vm     = _get_vm(conversation_id, conv["persist_dir"])
        engine = RAGEngine(vector_manager=vm, model_name=_cfg.llm_model)

        from langchain_core.messages import HumanMessage, AIMessage
        for msg in conv["messages"]:
            if msg["role"] == "user":
                engine.chat_history.append(HumanMessage(content=msg["content"]))
            else:
                engine.chat_history.append(AIMessage(content=msg["content"]))

        _engines[conversation_id] = engine

    return {
        "conversation_id": conversation_id,
        "title":           conv["title"],
        "messages":        conv["messages"],
    }


#  DELETE /api/conversations/{id} 

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    deleted = store.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    _engines.pop(conversation_id, None)
    _vms.pop(conversation_id, None)
    return {"message": "Conversation deleted."}


#  POST /api/chat/{conversation_id} 

class ChatRequest(BaseModel):
    question: str


@router.post("/chat/{conversation_id}")
async def chat(conversation_id: str, req: ChatRequest):
    """Q&A within a conversation. Persists messages to data.json."""
    # Restore if not in memory
    if conversation_id not in _engines:
        conv = store.get_conversation(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        vm     = _get_vm(conversation_id, conv["persist_dir"])
        engine = RAGEngine(vector_manager=vm, model_name=_cfg.llm_model)
        _engines[conversation_id] = engine

    engine = _engines[conversation_id]

    if engine.vector_manager.db is None:
        raise HTTPException(status_code=400, detail="Vector database not loaded.")

    loop = asyncio.get_event_loop()
    answer, docs, confidence = await loop.run_in_executor(
        None, lambda: engine.ask(req.question)
    )

    sources = [
        {
            "title":       doc.metadata.get("filename", doc.metadata.get("source", "Unknown")),
            "page":        doc.metadata.get("page_number"),
            "source_type": doc.metadata.get("source_type", "text"),
            "excerpt":     doc.page_content[:200],
        }
        for doc in docs
    ]

    # Persist to JSON
    store.save_message(conversation_id, "user", req.question)
    store.save_message(conversation_id, "assistant", answer,
                       confidence=confidence, sources=sources)

    return {"answer": answer, "confidence": confidence, "sources": sources}


#  DELETE /api/chat/{conversation_id}/history 

@router.delete("/chat/{conversation_id}/history")
async def clear_chat_history(conversation_id: str):
    """Clear in-memory LLM history (does NOT delete from data.json)."""
    if conversation_id in _engines:
        _engines[conversation_id].reset_history()
    return {"message": "In-memory chat history cleared."}


#  GET /api/chunks/{conversation_id} 

@router.get("/chunks/{conversation_id}")
async def get_chunks(
    conversation_id: str,
    page:     int = Query(default=1,  ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """Paginated chunk preview  reads directly from ChromaDB."""
    conv = store.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    vm = _get_vm(conversation_id, conv["persist_dir"])
    if vm.db is None:
        raise HTTPException(status_code=400, detail="Vector database not loaded.")

    raw          = vm.db.get(include=["documents", "metadatas"])
    all_docs     = raw.get("documents", [])
    all_metadata = raw.get("metadatas", [])

    total       = len(all_docs)
    total_pages = max(1, -(-total // per_page))
    start       = (page - 1) * per_page
    end         = min(start + per_page, total)

    chunks = [
        {
            "content":     all_docs[i],
            "source_type": all_metadata[i].get("source_type", "text"),
            "page":        all_metadata[i].get("page_number"),
            "source":      all_metadata[i].get("filename",
                           all_metadata[i].get("source", "unknown")),
        }
        for i in range(start, end)
    ]

    return {
        "chunks":      chunks,
        "total":       total,
        "page":        page,
        "per_page":    per_page,
        "total_pages": total_pages,
    }


#  GET /api/system/vram 

@router.get("/system/vram")
async def system_vram():
    info = get_vram_info()
    return {
        "is_connected":  info.is_connected,
        "used_bytes":    info.used_bytes,
        "total_bytes":   info.total_bytes,
        "used_pct":      info.used_pct,
        "loaded_models": info.loaded_models,
    }


#  GET /api/system/health 

@router.get("/system/health")
async def system_health():
    return {"ollama_connected": is_ollama_running()}