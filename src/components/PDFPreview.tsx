import { motion } from "motion/react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface Source {
    id: string;
    title: string;
    page: number;
    type: "text" | "image" | "table";
    excerpt: string;
}

interface PDFPreviewProps {
    source: Source;
    onClose: () => void;
}

const PDFPreview = ({ source, onClose }: PDFPreviewProps) => {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-3 backdrop-blur-sm">
                <div>
                    <h3 className="font-medium text-foreground text-sm">Document Preview</h3>
                    <p className="text-xs text-muted-foreground">Page {source.page}</p>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Content */}
            <ScrollArea className="flex-1 w-full overflow-y-auto bg-muted/20">
                <div className="p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-2xl"
                    >
                        {/* Page Header */}
                        <div className="mb-6 border-b border-gray-200 pb-4">
                            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                {source.type === "table" ? "Table" : source.type === "image" ? "Image" : "Text"} - Page {source.page}
                            </div>
                            <h1 className="mt-2 font-['Source_Serif_Pro'] text-xl font-bold text-gray-900">
                                {source.title}
                            </h1>
                        </div>

                        {/* Chunk Content ? real excerpt from backend */}
                        <div className="font-['Source_Serif_Pro'] text-sm leading-relaxed text-gray-700 w-full">
                            <motion.div
                                initial={{ backgroundColor: "rgba(139, 92, 246, 0)" }}
                                animate={{ backgroundColor: "rgba(139, 92, 246, 0.08)" }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="rounded-lg border-l-4 border-primary p-4"
                            >
                                <p className="whitespace-pre-wrap text-gray-900">
                                    {source.excerpt}
                                </p>
                            </motion.div>
                        </div>

                        {/* Page Footer */}
                        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
                            {source.title} - Page {source.page}
                        </div>
                    </motion.div>
                </div>
            </ScrollArea>
        </div>
    );
}

export default PDFPreview