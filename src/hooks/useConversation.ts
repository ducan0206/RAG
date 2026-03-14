import { useState, useEffect, useCallback } from "react";

export interface ChatHistoryItem {
    id:        string;
    title:     string;
    timestamp: string;
    category:  "Today" | "Yesterday" | "Last 30 Days";
}

export interface GroupedHistory {
    Today:          ChatHistoryItem[];
    Yesterday:      ChatHistoryItem[];
    "Last 30 Days": ChatHistoryItem[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useConversations() {
    const [grouped, setGrouped] = useState<GroupedHistory>({
        Today: [], Yesterday: [], "Last 30 Days": [],
    });

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/conversations`);
            if (!res.ok) return;
            const data: GroupedHistory = await res.json();
            setGrouped(data);
        } catch {
            // silently fail — sidebar stays empty
        }
    }, []);

    const deleteConversation = useCallback(async (id: string) => {
        await fetch(`${API_BASE}/api/conversations/${id}`, { method: "DELETE" });
        refresh();
    }, [refresh]);

    useEffect(() => { refresh(); }, [refresh]);

    return { grouped, refresh, deleteConversation };
}
