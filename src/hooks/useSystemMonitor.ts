import { useState, useEffect } from "react";

interface VRAMData {
    is_connected:  boolean;
    used_pct:      number;
    loaded_models: string[];
    used_bytes:    number;
    total_bytes:   number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useSystemMonitor(intervalMs = 5000) {
    const [data, setData] = useState<VRAMData>({
        is_connected:  false,
        used_pct:      0,
        loaded_models: [],
        used_bytes:    0,
        total_bytes:   0,
    });

    useEffect(() => {
        let cancelled = false;

        const fetchVram = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/system/vram`);
                if (!res.ok) throw new Error();
                const json: VRAMData = await res.json();
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled) setData(prev => ({ ...prev, is_connected: false }));
            }
        };

        fetchVram();
        const id = setInterval(fetchVram, intervalMs);
        return () => { cancelled = true; clearInterval(id); };
    }, [intervalMs]);

    return {
        vramPct:      data.used_pct,
        isConnected:  data.is_connected,
        loadedModels: data.loaded_models,
    };
}
