import { motion } from "motion/react";
import { Upload, Scissors, Layers, Sparkles, Database, Check, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router";
import { useIngestStream } from "../hooks/useIngestStream";

const ICONS = [Upload, Scissors, Layers, Sparkles, Database, Check];

const PipelineView = () => {
    const navigate = useNavigate();
    const { steps, currentDetail, stats, conversationId, error, isRunning } = useIngestStream();

    const progress = (() => {
        const done = steps.filter(s => s.status === "completed").length;
        const proc = steps.find(s => s.status === "processing") ? 0.5 : 0;
        return Math.round(((done + proc) / steps.length) * 100);
    })();

    const isCompleted = stats !== null;
    const activeStep  = steps.find(s => s.status === "processing");

    return (
        <div className="flex h-full flex-col overflow-auto bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 px-8 py-6 backdrop-blur-sm">
                <h1 className="font-['Inter'] text-2xl font-semibold text-foreground">
                    Document Processing Pipeline
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {currentDetail || (isCompleted ? "Pipeline complete!" : "Waiting to start...")}
                </p>
            </div>

            {/* Stepper */}
            <div className="border-b border-border bg-card/30 px-8 py-6 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const Icon = ICONS[index];
                        return (
                            <div key={step.id} className="flex flex-1 items-center">
                                <div className="flex flex-col items-center gap-2">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{
                                            scale: 1,
                                            opacity: 1,
                                            boxShadow:
                                                step.status === "processing" ? "0 0 20px rgba(139, 92, 246, 0.5)"
                                              : step.status === "completed"  ? "0 0 10px rgba(34, 211, 238, 0.3)"
                                              : "none",
                                        }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                                            step.status === "completed"  ? "border-secondary bg-secondary/20 text-secondary"
                                          : step.status === "processing" ? "border-primary bg-primary/20 text-primary"
                                          : "border-border bg-accent/50 text-muted-foreground"
                                        }`}
                                    >
                                        {step.status === "processing" ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Loader2 className="h-5 w-5" />
                                            </motion.div>
                                        ) : (
                                            <Icon className="h-5 w-5" />
                                        )}
                                    </motion.div>
                                    <span className={`text-xs font-medium ${
                                        step.status === "completed"  ? "text-secondary"
                                      : step.status === "processing" ? "text-primary"
                                      : "text-muted-foreground"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>

                                {index < steps.length - 1 && (
                                    <div className="mx-2 h-0.5 flex-1 bg-border">
                                        <motion.div
                                            animate={{
                                                width: step.status === "completed"  ? "100%"
                                                     : step.status === "processing" ? "50%"
                                                     : "0%",
                                            }}
                                            transition={{ duration: 0.5 }}
                                            className={`h-full ${step.status === "completed" ? "bg-secondary" : "bg-primary"}`}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="mx-auto max-w-4xl space-y-6">

                    {/* Active process card */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-card to-accent p-8 shadow-2xl shadow-primary/10"
                    >
                        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent" />
                        <div className="relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {isCompleted ? "Pipeline Complete" : activeStep?.label ?? "Initializing..."}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {currentDetail || "Waiting..."}
                                    </p>
                                </div>
                                <motion.div
                                    animate={{ rotate: isRunning ? 360 : 0 }}
                                    transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" }}
                                    className="rounded-full bg-primary/10 p-3"
                                >
                                    <Layers className="h-6 w-6 text-primary" />
                                </motion.div>
                            </div>

                            {/* Stats — real numbers from backend */}
                            <div className="mt-6 grid grid-cols-3 gap-4">
                                <div className="rounded-lg bg-background/50 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-primary">
                                        {stats?.total_elements ?? "—"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Atomic Elements</div>
                                </div>
                                <div className="rounded-lg bg-background/50 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-secondary">
                                        {stats?.total_chunks ?? "—"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Semantic Chunks</div>
                                </div>
                                <div className="rounded-lg bg-background/50 p-4 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-chart-3">
                                        {stats?.pages_processed ?? "—"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Pages Processed</div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-6">
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Processing Progress</span>
                                    <span className="font-medium text-foreground">{progress}%</span>
                                </div>
                                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                                    <motion.div
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.4 }}
                                        className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                                    />
                                    <motion.div
                                        animate={{ x: [-20, 200], opacity: [0, 1, 0] }}
                                        transition={{ duration: 1.5, repeat: isRunning ? Infinity : 0, ease: "easeInOut" }}
                                        className="absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-white/30 to-transparent"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Completed steps cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {steps.filter(s => s.status === "completed").map(step => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-border bg-card p-6"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                                        <Check className="h-5 w-5 text-secondary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground">{step.label}</h3>
                                        <p className="text-xs text-muted-foreground">Completed</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => navigate("/")}>
                            Cancel
                        </Button>
                        {isCompleted && conversationId && (
                            <Button
                                className="bg-primary"
                                onClick={() => navigate(`/?conv=${conversationId}`)}
                            >
                                Start Chat Session
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipelineView;
