"""
SystemMonitor ? queries Ollama local API for VRAM / model info.

Endpoints used:
  GET http://localhost:11434/api/ps    ? running models + size_vram
  GET http://localhost:11434/api/tags  ? health check
"""

import subprocess
import httpx
from dataclasses import dataclass, field

OLLAMA_BASE = "http://localhost:11434"
_TIMEOUT    = 2.0

@dataclass
class VRAMInfo:
    is_connected:   bool  = False
    used_bytes:     int   = 0
    total_bytes:    int   = 0
    used_pct:       float = 0.0
    loaded_models:  list  = field(default_factory=list)

def get_vram_info() -> VRAMInfo:
    """
    Query Ollama /api/ps for VRAM used by active models.
    Total VRAM is read from nvidia-smi (0 if unavailable).
    """
    try:
        resp = httpx.get(f"{OLLAMA_BASE}/api/ps", timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return VRAMInfo(is_connected=False)

    models         = data.get("models", [])
    used_bytes     = sum(m.get("size_vram", 0) for m in models)
    loaded_models  = [m.get("name", "") for m in models]
    total_bytes    = _get_total_vram_bytes()
    used_pct       = round(used_bytes / total_bytes * 100, 1) if total_bytes > 0 else 0.0

    return VRAMInfo(
        is_connected=True,
        used_bytes=used_bytes,
        total_bytes=total_bytes,
        used_pct=used_pct,
        loaded_models=loaded_models,
    )

def _get_total_vram_bytes() -> int:
    """Read total GPU VRAM from nvidia-smi (MiB ? bytes). Returns 0 if unavailable."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3,
        )
        mib = int(result.stdout.strip().splitlines()[0])
        return mib * 1024 * 1024
    except Exception:
        return 0

def is_ollama_running() -> bool:
    try:
        resp = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=_TIMEOUT)
        return resp.status_code == 200
    except Exception:
        return False