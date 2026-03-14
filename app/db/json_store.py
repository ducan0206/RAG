"""
JSON file storage replaces SQLAlchemy/MySQL.

All data lives in a single file: app/db/data.json

Structure:
{
  "conversations": {
    "<conv_id>": {
      "id":            "...",
      "title":         "paper.pdf",
      "pdf_filename":  "paper.pdf",
      "persist_dir":   "./app/db/chroma_db/<conv_id>",
      "created_at":    "2024-03-11T10:30:00",
      "updated_at":    "2024-03-11T10:35:00",
      "stats": { "total_elements": 220, ... },
      "messages": [
        {
          "id":         "...",
          "role":       "user" | "assistant",
          "content":    "...",
          "confidence": 87.3,
          "created_at": "...",
          "sources": [
            { "id": "...", "title": "...", "page": 12,
              "source_type": "text", "excerpt": "..." }
          ]
        }
      ]
    }
  }
}
"""

import json
import os
import threading
from datetime import datetime

# Thread lock prevents concurrent writes corrupting the file
_lock = threading.Lock()


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


class JSONStore:
    def __init__(self, path: str):
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            self._write({"conversations": {}})

    # Low-level read / write

    def _read(self) -> dict:
        if os.path.getsize(self.path) == 0:
            return {"conversations": {}}
        with open(self.path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write(self, data: dict) -> None:
        # Write to temp file first, then rename atomic on most OSes
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)

    # Conversations

    def create_conversation(self, conv_id: str, pdf_filename: str, persist_dir: str) -> dict:
        with _lock:
            data = self._read()
            conv = {
                "id":           conv_id,
                "title":        pdf_filename,
                "pdf_filename": pdf_filename,
                "persist_dir":  persist_dir,
                "created_at":   _now(),
                "updated_at":   _now(),
                "stats":        None,
                "messages":     [],
            }
            data["conversations"][conv_id] = conv
            self._write(data)
        return conv

    def update_stats(self, conv_id: str, stats: dict) -> None:
        with _lock:
            data = self._read()
            if conv_id in data["conversations"]:
                data["conversations"][conv_id]["stats"]      = stats
                data["conversations"][conv_id]["updated_at"] = _now()
                self._write(data)

    def get_conversation(self, conv_id: str) -> dict | None:
        return self._read()["conversations"].get(conv_id)

    def delete_conversation(self, conv_id: str) -> bool:
        with _lock:
            data = self._read()
            if conv_id not in data["conversations"]:
                return False
            del data["conversations"][conv_id]
            self._write(data)
        return True

    def list_conversations_grouped(self) -> dict:
        """
        Returns conversations grouped Today / Yesterday / Last 30 Days
        sorted newest-first matches AppSidebar ChatHistory format.
        """
        from datetime import timedelta
        now    = datetime.utcnow()
        convs  = list(self._read()["conversations"].values())

        # Sort newest first
        convs.sort(key=lambda c: c["created_at"], reverse=True)

        grouped: dict = {"Today": [], "Yesterday": [], "Last 30 Days": []}

        for conv in convs:
            created = datetime.fromisoformat(conv["created_at"])
            delta   = (now - created).days

            if delta == 0:
                cat = "Today"
                ts  = created.strftime("%I:%M %p").lstrip("0")
            elif delta == 1:
                cat = "Yesterday"
                ts  = created.strftime("%I:%M %p").lstrip("0")
            elif delta <= 30:
                cat = "Last 30 Days"
                ts  = f"{created.strftime('%b')} {created.day}"
            else:
                continue   # older than 30 days skip

            grouped[cat].append({
                "id":        conv["id"],
                "title":     conv["title"],
                "timestamp": ts,
                "category":  cat,
            })

        return grouped

    # Messages

    def save_message(
        self,
        conv_id:    str,
        role:       str,
        content:    str,
        confidence: float | None = None,
        sources:    list[dict]   | None = None,
    ) -> dict:
        import uuid
        msg = {
            "id":         str(uuid.uuid4()),
            "role":       role,
            "content":    content,
            "confidence": confidence,
            "created_at": _now(),
            "sources":    sources or [],
        }
        with _lock:
            data = self._read()
            if conv_id not in data["conversations"]:
                raise KeyError(f"Conversation {conv_id} not found.")
            data["conversations"][conv_id]["messages"].append(msg)
            data["conversations"][conv_id]["updated_at"] = _now()
            self._write(data)
        return msg

    def get_messages(self, conv_id: str) -> list[dict]:
        conv = self.get_conversation(conv_id)
        return conv["messages"] if conv else []