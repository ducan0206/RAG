import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { useNavigate } from "react-router";
import { useIngestStream } from "../hooks/useIngestStream";

interface FileUploadDialogProps {
    open:    boolean;
    onClose: (open: boolean) => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024)        return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export function FileUploadDialog({ open, onClose }: FileUploadDialogProps) {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging]     = useState(false);

    const { upload, reset, steps, currentDetail, stats, conversationId, error, isRunning } =
        useIngestStream();

    const isPipelineStarted = isRunning || stats !== null || error !== null;
    const isCompleted       = stats !== null;

    const overallProgress = (() => {
        const done = steps.filter(s => s.status === "completed").length;
        const proc = steps.find(s => s.status === "processing") ? 0.5 : 0;
        return Math.round(((done + proc) / steps.length) * 100);
    })();

    const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop      = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) setSelectedFile(file);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
    };

    const handleStartProcessing = () => {
        if (selectedFile) upload(selectedFile);
    };

    const handleGoToChat = () => {
        onClose(false);
        if (conversationId) navigate(`/?conv=${conversationId}`);
        setTimeout(() => { setSelectedFile(null); reset(); }, 300);
    };

    const handleClose = () => {
        if (isRunning) return;
        onClose(false);
        setTimeout(() => { setSelectedFile(null); reset(); }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl border-border bg-card">
                <DialogHeader>
                    <DialogTitle className="font-['Inter'] text-xl text-foreground">Upload Documents</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Upload a PDF to process with the RAG pipeline
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">

                    {!isPipelineStarted && (
                        <motion.div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            animate={{
                                borderColor: isDragging ? "rgb(139, 92, 246)" : "rgb(42, 44, 48)",
                                backgroundColor: isDragging ? "rgba(139, 92, 246, 0.05)" : "rgba(26, 28, 32, 0.5)",
                            }}
                            className="relative overflow-hidden rounded-xl border-2 border-dashed p-12 text-center transition-all"
                        >
                            {isDragging && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-linear-to-br from-primary/10 to-secondary/10"
                                />
                            )}
                            <div className="relative">
                                <motion.div
                                    animate={{ scale: isDragging ? 1.1 : 1, rotate: isDragging ? 5 : 0 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-secondary/20"
                                >
                                    <Upload className="h-8 w-8 text-primary" />
                                </motion.div>
                                <h3 className="mb-2 font-medium text-foreground">
                                    {selectedFile
                                        ? selectedFile.name
                                        : isDragging ? "Drop file here" : "Drag & drop PDF here"}
                                </h3>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    {selectedFile
                                        ? formatFileSize(selectedFile.size)
                                        : "or click to browse from your computer"}
                                </p>
                                <input
                                    type="file"
                                    onChange={handleFileInput}
                                    accept=".pdf"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                                {!selectedFile && (
                                    <div className="flex justify-center gap-2">
                                        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">PDF</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {isPipelineStarted && (
                        <div className="space-y-4">
                            {/* Stepper */}
                            <div className="flex items-center justify-between">
                                {steps.map((step, index) => (
                                    <div key={step.id} className="flex flex-1 items-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs transition-all ${
                                                step.status === "completed"  ? "border-chart-3 bg-chart-3/20 text-chart-3"
                                              : step.status === "processing" ? "border-primary bg-primary/20 text-primary"
                                              : "border-border bg-accent/50 text-muted-foreground"
                                            }`}>
                                                {step.status === "completed" ? (
                                                    <Check className="h-4 w-4" />
                                                ) : step.status === "processing" ? (
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent"
                                                    />
                                                ) : (
                                                    <span>{index + 1}</span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-medium ${
                                                step.status === "completed"  ? "text-chart-3"
                                              : step.status === "processing" ? "text-primary"
                                              : "text-muted-foreground"
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className="mx-1 mb-4 h-0.5 flex-1 bg-border">
                                                <motion.div
                                                    animate={{ width: step.status === "completed" ? "100%" : "0%" }}
                                                    transition={{ duration: 0.4 }}
                                                    className="h-full bg-chart-3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Progress bar + detail */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{isCompleted ? "Pipeline complete!" : currentDetail || "Starting..."}</span>
                                    <span>{overallProgress}%</span>
                                </div>
                                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                                    <motion.div
                                        animate={{ width: `${overallProgress}%` }}
                                        transition={{ duration: 0.4 }}
                                        className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                                    />
                                </div>
                            </div>

                            {/* Stats grid */}
                            {isCompleted && stats && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-3 gap-3"
                                >
                                    {[
                                        { label: "Elements", value: stats.total_elements },
                                        { label: "Chunks",   value: stats.total_chunks },
                                        { label: "Pages",    value: stats.pages_processed },
                                        { label: "Tables",   value: stats.tables },
                                        { label: "Images",   value: stats.images },
                                        { label: "Text",     value: stats.texts },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="rounded-lg border border-border bg-accent/50 p-3 text-center">
                                            <div className="text-lg font-bold text-primary">{value}</div>
                                            <div className="text-xs text-muted-foreground">{label}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleClose} disabled={isRunning}>
                            Cancel
                        </Button>

                        {!isPipelineStarted && (
                            <Button
                                onClick={handleStartProcessing}
                                disabled={!selectedFile}
                                className="gap-2 bg-linear-to-r from-primary to-secondary"
                            >
                                {isRunning ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Upload className="h-4 w-4" />
                                        </motion.div>
                                        <span>Starting Pipeline...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        <span>Process File</span>
                                    </>
                                )}
                            </Button>
                        )}

                        {isCompleted && !error && (
                            <Button
                                onClick={handleGoToChat}
                                className="gap-2 bg-linear-to-r from-primary to-secondary"
                            >
                                <Check className="h-4 w-4" />
                                Start Chatting
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
