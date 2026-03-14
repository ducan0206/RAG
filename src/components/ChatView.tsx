import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Paperclip, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import SourceCard from "./SourceCard";
import PDFPreview from "./PDFPreview";
import EmptyState from "./EmptyState";
import { FileUploadDialog } from "./FileUploadDialog";
import { useSearchParams } from "react-router";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface Source {
    id:          string;
    title:       string;
    page:        number;
    type:        "text" | "image" | "table";
    source_type: "text" | "image" | "table";
    excerpt:     string;
}

interface Message {
    id:          string;
    role:        "user" | "assistant";
    content:     string;
    sources?:    Source[];
    confidence?: number;
}

const ChatView = () => {
    const [searchParams]  = useSearchParams();
    const convId          = searchParams.get("conv");

    const [messages, setMessages]             = useState<Message[]>([]);
    const [input, setInput]                   = useState("");
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [isLoading, setIsLoading]           = useState(false);
    const [showUploadDialog, setShowUpload]   = useState(false);
    const [convTitle, setConvTitle]           = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!convId) { setMessages([]); setConvTitle(null); return; }

        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/conversations/${convId}/messages`);
                if (!res.ok) return;
                const data = await res.json();
                setConvTitle(data.title);
                setMessages(data.messages.map((m: any) => ({
                    ...m,
                    sources: m.sources?.map((s: any) => ({
                        ...s,
                        id:   s.id ?? Math.random().toString(36),
                        type: s.source_type ?? "text",
                    })),
                })));
            } catch { /* ignore */ }
        };
        load();
    }, [convId]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || !convId || isLoading) return;

        const userMsg: Message = {
            id:      Date.now().toString(),
            role:    "user",
            content: input.trim(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat/${convId}`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ question: userMsg.content }),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();

            const assistantMsg: Message = {
                id:         Date.now().toString() + "_a",
                role:       "assistant",
                content:    data.answer,
                confidence: data.confidence,
                sources:    data.sources?.map((s: any, i: number) => ({
                    id:          `${Date.now()}_s${i}`,
                    title:       s.title,
                    page:        s.page ?? 0,
                    type:        s.source_type ?? "text",
                    source_type: s.source_type ?? "text",
                    excerpt:     s.excerpt,
                })),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch {
            setMessages(prev => [...prev, {
                id:      Date.now().toString() + "_err",
                role:    "assistant",
                content: "Something went wrong. Please try again.",
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const showWelcome = !convId && messages.length === 0;

    return (
        <>
            <div className="flex h-full w-full overflow-hidden bg-background">
                {/* Main Chat Area */}
                <div className={`flex flex-1 flex-col ${selectedSource ? "w-3/5" : "w-full"} transition-all duration-300 overflow-hidden`}>

                    {/* Header - Fixed Height */}
                    <header className="shrink-0 border-b border-border bg-card/50 px-6 py-4 backdrop-blur-sm z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-['Inter'] text-lg font-semibold text-foreground">
                                    {convTitle ?? "Document Intelligence"}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {convId ? "Ask questions about your document" : "Upload a document to start"}
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Middle Content - Scrollable Area */}
                    <div className="flex-1 min-h-0 relative">
                        {showWelcome ? (
                            <div className="h-full w-full overflow-y-auto custom-scrollbar">
                                <EmptyState />
                            </div>
                        ) : (
                            <ScrollArea className="h-full w-full">
                                <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
                                    <AnimatePresence initial={false}>
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm ${
                                                    message.role === "user"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "border border-border bg-card"
                                                }`}>
                                                    {/* Confidence Gauge */}
                                                    {message.role === "assistant" && message.confidence != null && (
                                                        <div className="mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
                                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Context Match</div>
                                                            <div className="relative h-1 w-16 overflow-hidden rounded-full bg-muted">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${message.confidence}%` }}
                                                                    transition={{ duration: 1, delay: 0.3 }}
                                                                    className="h-full rounded-full bg-primary"
                                                                />
                                                            </div>
                                                            <div className="text-xs font-bold text-primary">
                                                                {message.confidence}%
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Message Content */}
                                                    <div
                                                        className={`font-['Source_Serif_Pro'] text-[15px] leading-relaxed ${
                                                            message.role === "user" ? "text-primary-foreground" : "text-foreground"
                                                        }`}
                                                        style={{ whiteSpace: "pre-line" }}
                                                    >
                                                        {message.content}
                                                    </div>

                                                    {/* Sources Grid */}
                                                    {message.sources && message.sources.length > 0 && (
                                                        <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                                                            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Verified Sources</div>
                                                            <div className="grid gap-2">
                                                                {message.sources.map((source) => (
                                                                    <SourceCard
                                                                        key={source.id}
                                                                        source={{ ...source, type: source.source_type ?? source.type }}
                                                                        onSelect={() => setSelectedSource(source)}
                                                                        isSelected={selectedSource?.id === source.id}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* AI Thinking Animation */}
                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="rounded-2xl border border-border bg-card px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {[0, 1, 2].map(i => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                                            className="h-2 w-2 rounded-full bg-primary"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {/* Invisible anchor for scroll-to-bottom */}
                                    <div ref={bottomRef} className="h-4 w-full" />
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* Input Area - Fixed Height */}
                    <footer className="shrink-0 border-t border-border bg-card/50 p-4 backdrop-blur-sm">
                        <div className="mx-auto max-w-3xl">
                            {/* Current Document Badge */}
                            {convTitle && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium"
                                    >
                                        <FileText className="h-3 w-3 text-primary" />
                                        <span className="text-foreground/80 truncate max-w-[200px]">{convTitle}</span>
                                    </motion.div>
                                </div>
                            )}

                            {/* Message Input Box */}
                            <div className="flex items-end gap-3 rounded-2xl border border-border bg-background p-3 shadow-xl focus-within:border-primary/50 transition-colors">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowUpload(true)}
                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder={convId ? "Ask a question about this document..." : "Please upload a document..."}
                                    disabled={!convId || isLoading}
                                    rows={1}
                                    className="flex-1 resize-none bg-transparent py-2 font-['Inter'] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                                    style={{ minHeight: "24px", maxHeight: "150px" }}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !convId || isLoading}
                                    className="h-9 w-9 shrink-0 rounded-xl bg-primary p-0 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* Right Side Panel: PDF Previewer */}
                <AnimatePresence>
                    {selectedSource && (
                        <motion.div
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="w-2/5 border-l border-border bg-card z-20"
                        >
                            <PDFPreview
                                source={selectedSource}
                                onClose={() => setSelectedSource(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <FileUploadDialog open={showUploadDialog} onClose={open => setShowUpload(open)} />
        </>
    );
};

export default ChatView;