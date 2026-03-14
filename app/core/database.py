from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from typing import List, Tuple

class VectorManager:
    def __init__(self, persist_dir: str, embed_model: str = "BAAI/bge-small-en"):
        self.persist_dir = persist_dir
        self.embeddings = HuggingFaceEmbeddings(model_name=embed_model)
        self.db = None

    def _check_db(self):
        if self.db is None:
            raise RuntimeError(
                "Database is not initialized. Call create_db() or load_db() first."
            )

    def create_db(self, documents: List[Document]) -> None:
        if not documents:
            raise ValueError("Cannot create database from empty document list.")

        self.db = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_dir,
            collection_metadata={"hnsw:space": "cosine"},
        )

        print(f"[VectorManager] Stored {len(documents)} chunks ? {self.persist_dir}")

    def load_db(self):
        self.db = Chroma(persist_directory=self.persist_dir, embedding_function=self.embeddings, collection_metadata={'hnsw:space': 'cosine'})
        print(f"[VectorManager] Loaded database from {self.persist_dir}")

    def get_retriever(self, k=3):
        self._check_db()
        return self.db.as_retriever(search_kwargs={"k": k})
    
    def retrieve_with_scores(self, query: str, k: int = 3) -> Tuple[List[Document], float]:
        """
        Returns (docs, confidence) where confidence is a 0-100 float
        derived from the cosine similarity of the top result.

        Cosine distance in ChromaDB is stored as (1 - similarity),
        so: similarity = 1 - distance ? confidence = similarity * 100
        """
        self._check_db()
        results: List[Tuple[Document, float]] = self.db.similarity_search_with_score(
            query, k=k
        )

        if not results:
            return [], 0.0

        docs = [doc for doc, _ in results]

        # Chroma cosine distance: 0 = identical, 1 = orthogonal
        # Convert top-doc distance ? confidence percentage
        top_distance = results[0][1]
        confidence = round((1 - top_distance) * 100, 1)

        return docs, confidence