import React, { useEffect, useState } from 'react';
import { Zap, Bell, Clock, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProactiveTask {
    id: string;
    taskType: string;
    description: string;
    frequency: string;
    lastRunAt: string | null;
    status: string;
}

const ProactiveControl: React.FC = () => {
    const [tasks, setTasks] = useState<ProactiveTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/proactive-tasks')
            .then(res => res.json())
            .then(data => {
                setTasks(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching proactive tasks:", error);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="h-20 animate-pulse bg-navy-800 rounded-xl" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
                <motion.div
                    key={task.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 bg-navy-900 border border-glass-border rounded-2xl shadow-lg relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2 bg-accent-light/10 text-accent-light rounded-lg mb-4">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest ${task.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-steel-500/20 text-steel-400'
                            }`}>
                            {task.status}
                        </div>
                    </div>

                    <h4 className="text-lg font-bold mb-1">{task.taskType}</h4>
                    <p className="text-steel-400 text-sm mb-6">{task.description}</p>

                    <div className="flex justify-between items-center text-xs text-steel-500">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Cada {task.frequency}
                        </div>
                        <div className="flex items-center gap-1">
                            Última: {task.lastRunAt ? new Date(task.lastRunAt).toLocaleTimeString() : 'Nunca'}
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 bg-navy-800 rounded-full hover:bg-navy-700 transition-colors">
                            <PlayCircle className="h-5 w-5 text-accent-light" />
                        </button>
                    </div>
                </motion.div>
            ))}
            {tasks.length === 0 && (
                <div className="col-span-full py-8 text-center text-steel-500 border border-dashed border-glass-border rounded-2xl">
                    No hay tareas proactivas configuradas.
                </div>
            )}
        </div>
    );
};

export default ProactiveControl;
