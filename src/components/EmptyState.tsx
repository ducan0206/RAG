import { motion } from "motion/react";
import { FileText, Sparkles, Zap, ArrowRight, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FileUploadDialog } from "./FileUploadDialog";

const suggestions = [
    "Summarize the key findings from this research paper",
    "Extract all statistical data from the clinical trial results",
    "What are the main conclusions about treatment efficacy?",
    "Compare the control group vs treatment group outcomes",
];

const EmptyState = () => {
    const navigate = useNavigate();
    const [showUploadDialog, setShowUploadDialog] = useState(false);

    return (
        <>
        <div className="flex min-h-full flex-col items-center justify-start py-12 px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-2xl space-y-8 text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-secondary/20"
                >
                    <Sparkles className="h-10 w-10 text-primary" />
                </motion.div>

                {/* Title */}
                <div className="space-y-3">
                    <h1 className="font-['Inter'] text-3xl font-semibold text-foreground">
                        Deep Document Intelligence
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Upload documents and ask questions powered by advanced RAG technology
                    </p>
                </div>

                {/* Features */}
                <div className="grid gap-4 text-left sm:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium text-foreground">Smart Chunking</h3>
                                <p className="text-xs text-muted-foreground">Semantic document parsing</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                                <FileText className="h-5 w-5 text-secondary" />
                            </div>
                            <div>
                                <h3 className="font-medium text-foreground">Source Citations</h3>
                                <p className="text-xs text-muted-foreground">Traceable references</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Suggestions */}
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
                    <div className="grid gap-2">
                        {suggestions.map((suggestion, index) => (
                            <motion.button
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-all hover:border-primary/50 hover:bg-card/80"
                            >
                                <span>{suggestion}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex gap-3 pt-4"
                >
                    <Button
                        onClick={() => setShowUploadDialog(true)}
                        size="lg"
                        className="gap-2 bg-linear-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30"
                    >
                        <Upload className="h-5 w-5" />
                        Upload Documents
                    </Button>
                    <Button
                        onClick={() => navigate("/pipeline")}
                        size="lg"
                        variant="outline"
                        className="gap-2"
                    >
                        <Sparkles className="h-5 w-5" />
                        View Demo
                    </Button>
                </motion.div>
            </motion.div>
        </div>
        <FileUploadDialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} />
        </>
    );
}

export default EmptyState