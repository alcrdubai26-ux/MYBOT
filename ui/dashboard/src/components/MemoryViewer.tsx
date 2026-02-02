import React, { useEffect, useState } from 'react';
import { Brain, Star, Clock, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemoryItem {
    id: string;
    category: string | null;
    content: string;
    importance: number | null;
    createdAt: string;
}

interface MemoryViewerProps {
    assistantId: string;
}

const MemoryViewer: React.FC<MemoryViewerProps> = ({ assistantId }) => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/assistants/${assistantId}/memory`)
            .then(res => res.json())
            .then(data => {
                setMemories(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching memory:", err);
                setLoading(false);
            });
    }, [assistantId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                    <Brain className="h-8 w-8 text-accent-light opacity-50" />
                </motion.div>
            </div>
        );
    }

    if (memories.length === 0) {
        return (
            <div className="text-center py-12 text-steel-500 bg-navy-800/50 rounded-xl border border-dashed border-glass-border">
                <Brain className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Aún no hay recuerdos semánticos guardados para este asistente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {memories.map((m, idx) => (
                <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-navy-800 border border-glass-border rounded-xl hover:border-accent-light/30 transition-colors group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3 text-accent-blue" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-blue">
                                {m.category || 'General'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {[...Array(m.importance || 1)].map((_, i) => (
                                <Star key={i} className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-steel-200 mb-3">{m.content}</p>
                    <div className="flex items-center gap-3 text-[10px] text-steel-500">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            ID: {m.id.substring(0, 8)}...
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default MemoryViewer;
