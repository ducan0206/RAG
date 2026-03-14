from unstructured.partition.pdf import partition_pdf
from langchain_ollama import OllamaLLM
from langchain_core.documents import Document

from typing import List, Literal, TypedDict, Callable
import os   

_CATEGORY_TO_SOURCE_TYPE: dict[str, str] = {
    "Table":          "table",
    "Image":          "image",
    "FigureCaption":  "image",
}

_STEPS = [
    ("upload",    "Upload"),
    ("partition", "Partitioning"),
    ("chunk",     "Chunking"),
    ("summarize", "AI Summarization"),
    ("vectorize", "Vectorization"),
    ("ready",     "Ready"),
]

def _resolve_source_type(category: str) -> Literal["text", "image", "table"]:
    """Normalize Unstructured element category to frontend source type."""
    return _CATEGORY_TO_SOURCE_TYPE.get(category, "text")

def _emit(cb, step: str, detail: str) -> None:
    if cb is None:
        return
    index = next((i for i, (s, _) in enumerate(_STEPS) if s == step), 0)
    label = _STEPS[index][1]
    cb({"step": step, "label": label, "detail": detail, "index": index, "total_steps": len(_STEPS)})

class DataIngestor:
    def __init__(self, model_vision="moondream"):
        self.vision_model = OllamaLLM(model=model_vision)

    def _summarize_image(self, base64_image):
        prompt = "Describe this image in detail for a search index. Focus on technical data."
        return self.vision_model.invoke([
            {"type": "image", "data": base64_image},
            {"type": "text", "text": prompt}
        ])

    def process_pdf(self, file_path: str, on_progress: Callable | None = None) -> tuple[List[Document], dict]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Not found: {file_path}")

        _emit(on_progress, "upload", f"Received {os.path.basename(file_path)}")

        _emit(on_progress, "partition", f"Partitioning with hi_res strategy...")
        print(f"[DataIngestor] Partitioning {file_path} ...")
        
        elements = partition_pdf(
            filename=file_path,
            strategy='hi_res',
            extract_images_in_pdf=True,
            infer_table_structure=True,
            chunking_strategy='by_title',
            max_characters=2000
        )

        pages = {
            el.metadata.page_number
            for el in elements
            if getattr(el.metadata, "page_number", None) is not None
        }

        _emit(on_progress, "partition", f"Extracted {len(elements)} atomic elements across {len(pages)} pages")
        
        _emit(on_progress, "chunk", "Building semantic chunks by title...")
        
        docs: List[Document] = []
        images_to_summarize:  list[tuple[int, str]] = []

        for el in elements:
            metadata = el.metadata.to_dict()
            content = str(el)

            metadata["source_type"] = _resolve_source_type(el.category)

            if el.category == "Table":
                metadata["table_html"] = el.metadata.text_as_html
            
            if el.category == "Image":
                image_b64 = metadata.get('image_base64')
                if image_b64:
                    images_to_summarize.append((len(docs), image_b64))
                    content = f"Visual Content Summary: {summary}"
            
            docs.append(Document(page_content=content, metadata=metadata))

        _emit(on_progress, "chunk", f"Created {len(docs)} chunks from {len(elements)} elements")

        image_count = len(images_to_summarize)
        if image_count > 0:
            _emit(on_progress, "summarize", f"Summarizing {image_count} image(s) with vision model...")
            for i, (doc_idx, image_b64) in enumerate(images_to_summarize, 1):
                summary = self._summarize_image(image_b64)
                docs[doc_idx].page_content = f"Visual Content Summary: {summary}"
                _emit(on_progress, "summarize", f"Summarized image {i}/{image_count}")
        else:
            _emit(on_progress, "summarize", "No images - skipping vision summarization")

        stats = {
            "total_elements":  len(elements),
            "total_chunks":    len(docs),
            "pages_processed": len(pages),
            "tables": sum(1 for d in docs if d.metadata.get("source_type") == "table"),
            "images": sum(1 for d in docs if d.metadata.get("source_type") == "image"),
            "texts":  sum(1 for d in docs if d.metadata.get("source_type") == "text"),
        }

        print(f"[DataIngestor] Done. Stats: {stats}")
        
        return docs, stats