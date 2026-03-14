from dataclasses import dataclass, field
from dotenv import load_dotenv
import os

load_dotenv()


@dataclass
class Config:
    # Paths
    pdf_path:        str = os.getenv("PDF_PATH",        "./documents")
    persist_dir:     str = os.getenv("PERSIST_DIR",     "./app/db/chroma_db")
    json_db_path:    str = os.getenv("JSON_DB_PATH",    "./app/db/data.json")
    tessdata_prefix: str = os.getenv("TESSDATA_PREFIX", r"C:\msys64\mingw64\share\tessdata")

    # Models
    embed_model:  str = os.getenv("EMBED_MODEL",  "BAAI/bge-small-en")
    llm_model:    str = os.getenv("LLM_MODEL",    "qwen2.5:1.5b")
    vision_model: str = os.getenv("VISION_MODEL", "moondream")

    # Retrieval
    retriever_k: int = int(os.getenv("RETRIEVER_K", "3"))

    # API
    api_host:     str  = os.getenv("API_HOST", "0.0.0.0")
    api_port:     int  = int(os.getenv("API_PORT", "8000"))
    cors_origins: list = field(default_factory=list)

    def __post_init__(self):
        if not self.cors_origins:
            raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
            self.cors_origins = [o.strip() for o in raw.split(",")]