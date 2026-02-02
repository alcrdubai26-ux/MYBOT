import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ListTodo, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserTask {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: number;
    category: string | null;
    dueDate: string | null;
}

interface TaskBoardProps {
    assistantId: string;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ assistantId }) => {
    const [tasks, setTasks] = useState<UserTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/assistants/${assistantId}/tasks`)
            .then(res => res.json())
            .then(data => {
                setTasks(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching tasks:", err);
                setLoading(false);
            });
    }, [assistantId]);

    if (loading) {
        return <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-navy-800 rounded-lg" />)}
        </div>;
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-steel-500 bg-navy-800/50 rounded-xl border border-dashed border-glass-border">
                <ListTodo className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>No hay tareas activas para este asistente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {tasks.map((task, idx) => (
                <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-xl border border-glass-border flex items-start gap-4 transition-all hover:bg-navy-800/80 ${task.status === 'completed' ? 'opacity-60 bg-navy-950/50' : 'bg-navy-900 shadow-sm'
                        }`}
                >
                    <div className="mt-1">
                        {task.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                            <Circle className="h-5 w-5 text-steel-600" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className={`font-semibold truncate ${task.status === 'completed' ? 'line-through text-steel-500' : 'text-white'}`}>
                                {task.title}
                            </h4>
                            {task.priority >= 8 && task.status !== 'completed' && (
                                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                            )}
                        </div>
                        {task.description && (
                            <p className="text-xs text-steel-400 line-clamp-2 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] bg-navy-800 text-accent-light px-2 py-0.5 rounded uppercase font-bold tracking-tight">
                                {task.category || 'General'}
                            </span>
                            {task.dueDate && (
                                <div className="flex items-center gap-1 text-[10px] text-steel-500">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default TaskBoard;
