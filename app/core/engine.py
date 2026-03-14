from langchain_ollama import OllamaLLM
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.documents import Document
from app.core.database import VectorManager
from typing import List, Tuple

class RAGEngine:
    def __init__(self, vector_manager: VectorManager, model_name: str="qwen2.5:1.5b"):
        self.vector_manager = vector_manager
        self.llm = OllamaLLM(model=model_name)
        self.chat_history: List = []

    def _get_standalone_question(self, question: str) -> str:
        if not self.chat_history:
            return question
        
        messages = [
            SystemMessage(content="Rewrite the user's question to be standalone based on history. Return ONLY the question."),
        ] + self.chat_history + [HumanMessage(content=f"New question: {question}")]
        
        rewritten = self.llm.invoke(messages).strip()
        print(f"[RAGEngine] Rewritten query: {rewritten}")
        return rewritten

    def ask(self, user_input: str) -> Tuple[str, List[Document], float]:
        standalone_q = self._get_standalone_question(user_input)

        docs, confidence = self.vector_manager.retrieve_with_scores(standalone_q)
            
        # retriever = self.vector_manager.get_retriever()
        # docs = retriever.invoke(standalone_q)
        
        context = "\n\n".join([d.page_content for d in docs])
        
        messages = [
            SystemMessage(content="Answer ONLY based on the context. If unsure, say I don't know."),
        ] + self.chat_history + [
            HumanMessage(content=f"Context:\n{context}\n\nQuestion: {user_input}")
        ]
        
        answer = self.llm.invoke(messages)
        
        self.chat_history.append(HumanMessage(content=user_input))
        self.chat_history.append(AIMessage(content=answer))
        
        return answer, docs, confidence
    
    def reset_history(self) -> None:
        self.chat_history.clear()
        print("[RAGEngine] Chat history cleared.")