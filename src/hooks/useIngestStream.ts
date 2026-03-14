import { useState, useCallback, useRef } from "react";

export type StepStatus = "pending" | "processing" | "completed";

export interface PipelineStep {
    id:     string;
    label:  string;
    status: StepStatus;
}

export interface ChunkStats {
    total_elements:  number;
    total_chunks:    number;
    pages_processed: number;
    tables:          number;
    images:          number;
    texts:           number;
}

const STEP_IDS    = ["upload", "partition", "chunk", "summarize", "vectorize", "ready"];
const STEP_LABELS = ["Upload", "Partitioning", "Chunking", "AI Summarization", "Vectorization", "Ready"];

const INITIAL_STEPS: PipelineStep[] = STEP_IDS.map((id, i) => ({
    id, label: STEP_LABELS[i], status: "pending",
}));

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useIngestStream() {
    const [steps, setSteps]           = useState<PipelineStep[]>(INITIAL_STEPS);
    const [currentDetail, setDetail]  = useState("");
    const [stats, setStats]           = useState<ChunkStats | null>(null);
    const [conversationId, setConvId] = useState<string | null>(null);
    const [error, setError]           = useState<string | null>(null);
    const [isRunning, setIsRunning]   = useState(false);
    const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

    const upload = useCallback(async (file: File) => {
        setIsRunning(true);
        setStats(null);
        setError(null);
        setConvId(null);
        setSteps(INITIAL_STEPS);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${API_BASE}/api/ingest/stream`, {
                method: "POST",
                body:   formData,
            });

            if (!response.ok || !response.body)
                throw new Error(`Server error: ${response.status}`);

            const reader = response.body
                .pipeThrough(new TextDecoderStream())
                .getReader();
            readerRef.current = reader;

            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += value;
                const messages = buffer.split("\n\n");
                buffer = messages.pop() ?? "";

                for (const msg of messages) {
                    if (!msg.trim()) continue;

                    const eventLine = msg.match(/^event:\s*(.+)$/m);
                    const dataLine  = msg.match(/^data:\s*(.+)$/ms);
                    if (!eventLine || !dataLine) continue;

                    const eventType = eventLine[1].trim();
                    const payload   = JSON.parse(dataLine[1].trim());

                    if (eventType === "progress") {
                        const activeIdx = STEP_IDS.indexOf(payload.step);
                        setDetail(payload.detail);
                        setSteps(INITIAL_STEPS.map((s, i) => ({
                            ...s,
                            status: i < activeIdx  ? "completed"
                                  : i === activeIdx ? "processing"
                                  : "pending",
                        })));
                    } else if (eventType === "ready") {
                        setConvId(payload.conversation_id);
                    } else if (eventType === "stats") {
                        setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "completed" })));
                        setStats(payload as ChunkStats);
                    } else if (eventType === "error") {
                        setError(payload.message);
                    }
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsRunning(false);
        }
    }, []);

    const reset = useCallback(() => {
        readerRef.current?.cancel();
        setSteps(INITIAL_STEPS);
        setDetail("");
        setStats(null);
        setConvId(null);
        setError(null);
        setIsRunning(false);
    }, []);

    return { upload, reset, steps, currentDetail, stats, conversationId, error, isRunning };
}
