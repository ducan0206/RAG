import { useState } from "react";
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Activity, Zap, GitBranch, Upload, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Progress } from "../ui/progress";
import { FileUploadDialog } from "./FileUploadDialog";
import { useSystemMonitor } from "../hooks/useSystemMonitor";
import { useConversations, type ChatHistoryItem } from "../hooks/useConversation";

const AppSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => {
    const navigate = useNavigate();
    const [showUploadDialog, setShowUploadDialog] = useState(false);

    const { vramPct, isConnected } = useSystemMonitor(5000);
    const { grouped, refresh, deleteConversation } = useConversations();

    const handleUploadClose = (open: boolean) => {
        setShowUploadDialog(open);
        if (!open) refresh(); // refresh sidebar after upload completes
    };

    return (
        <>
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? "64px" : "280px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative h-full border-r border-border bg-sidebar backdrop-blur-xl"
            style={{
                background: "linear-gradient(180deg, rgba(13, 15, 18, 0.98) 0%, rgba(26, 28, 32, 0.95) 100%)",
            }}
        >
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border p-4">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                                <Zap className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <span className="font-['Inter'] text-lg font-semibold text-foreground">Vision PDF</span>
                        </motion.div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* New Conversation */}
                <div className="p-4">
                    <Button
                        onClick={() => navigate("/")}
                        className="flex w-full items-center justify-start gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
                    >
                        <Plus className="h-4 w-4" />
                        {!isCollapsed && <span>New Conversation</span>}
                    </Button>
                </div>

                {/* Upload Documents */}
                <div className="px-4 pb-2">
                    <Button
                        onClick={() => setShowUploadDialog(true)}
                        variant="outline"
                        className="w-full justify-start gap-2 border-secondary/30 bg-secondary/5 text-foreground hover:bg-secondary/10"
                    >
                        <Upload className="h-4 w-4 text-secondary" />
                        {!isCollapsed && <span>Upload Documents</span>}
                    </Button>
                </div>

                {/* Pipeline Button */}
                {!isCollapsed && (
                    <div className="px-4 pb-4">
                        <Button
                            onClick={() => navigate("/pipeline")}
                            variant="outline"
                            className="w-full justify-start gap-2 border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                        >
                            <GitBranch className="h-4 w-4 text-primary" />
                            <span>View Pipeline</span>
                        </Button>
                    </div>
                )}

                {/* Chat History real data from backend */}
                {!isCollapsed && (
                    <ScrollArea className="flex-1 px-2">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-6 py-2"
                        >
                            {Object.entries(grouped).map(([category, items]) =>
                                items.length === 0 ? null : (
                                    <div key={category} className="space-y-1">
                                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                            {category}
                                        </div>
                                        {items.map((item: ChatHistoryItem) => (
                                            <div
                                                key={item.id}
                                                className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent"
                                            >
                                                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <Link
                                                    to={`/?conv=${item.id}`}
                                                    className="flex-1 truncate"
                                                >
                                                    {item.title}
                                                </Link>
                                                <button
                                                    onClick={() => deleteConversation(item.id)}
                                                    className="hidden text-muted-foreground hover:text-destructive group-hover:block"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </motion.div>
                    </ScrollArea>
                )}

                {/* System Pulse real VRAM */}
                <div className="mt-auto border-t border-border p-4">
                    {isCollapsed ? (
                        <div className="flex justify-center">
                            <Activity className={`h-5 w-5 ${isConnected ? "text-chart-3" : "text-muted-foreground"}`} />
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-3 rounded-lg bg-accent/50 p-3 backdrop-blur-sm"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">System Pulse</span>
                                <div className="flex items-center gap-1">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        className={`h-2 w-2 rounded-full ${isConnected ? "bg-chart-3" : "bg-muted-foreground"}`}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {isConnected ? "Connected" : "Offline"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">VRAM Usage</span>
                                    <span className="font-medium text-foreground">{vramPct}%</span>
                                </div>
                                <Progress value={vramPct} className="h-1.5" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                <span>Ollama Local Runtime</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.aside>

        <FileUploadDialog open={showUploadDialog} onClose={handleUploadClose} />
        </>
    );
};

export default AppSidebar;
