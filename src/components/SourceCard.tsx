import { motion } from "motion/react";
import { FileText, Image as ImageIcon, Table, ChevronRight } from "lucide-react";

interface Source {
    id: string;
    title: string;
    page: number;
    type: "text" | "image" | "table";
    excerpt: string;
}

interface SourceCardProps {
    source: Source;
    onSelect: () => void;
    isSelected: boolean;
}

const typeConfig = {
    text: {
        icon: FileText,
        label: "Text",
        color: "text-primary",
        bgColor: "bg-primary/10",
    },
    image: {
        icon: ImageIcon,
        label: "Image Summary",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
    },
    table: {
        icon: Table,
        label: "Table Data",
        color: "text-chart-3",
        bgColor: "bg-chart-3/10",
    },
};

const SourceCard = ({ source, onSelect, isSelected }: SourceCardProps) => {
    const config = typeConfig[source.type];
    const Icon = config.icon;

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={`group relative w-full overflow-hidden rounded-lg border text-left transition-all ${
                isSelected
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-accent/50 hover:border-primary/50 hover:bg-accent"
            }`}
        >
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${config.bgColor} ${config.color}`}>
                                <Icon className="h-3 w-3" />
                                <span>{config.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Page {source.page}</span>
                        </div>
                        <div className="font-medium text-foreground text-sm">{source.title}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">{source.excerpt}</div>
                    </div>
                    <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-all ${
                            isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    />
                </div>
            </div>
            {isSelected && (
                <motion.div
                    layoutId="activeSource"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-primary to-secondary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </motion.button>
    );
}

export default SourceCard