"""
RAG System ? FastAPI Server
Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.config import Config
from app.api.routes import router

cfg = Config()

app = FastAPI(
    title="RAG System API",
    description="Multimodal PDF Q&A powered by Ollama + ChromaDB",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "status":  "ok",
        "message": "RAG System API is running",
        "docs":    "/docs",
    }