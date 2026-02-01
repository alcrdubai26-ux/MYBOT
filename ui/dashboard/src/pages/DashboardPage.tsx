import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Phone, Send, Zap, Settings, X } from 'lucide-react';
import CreateAssistantModal from '../components/CreateAssistantModal';
import ChannelConnector from '../components/ChannelConnector';

interface Assistant {
    id: string;
    name: string;
    personality: string;
    defaultLlm: string;
}

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);

    const fetchAssistants = () => {
        fetch('/api/assistants')
            .then(res => res.json())
            .then(data => setAssistants(data));
    };

    useEffect(() => {
        fetchAssistants();
    }, []);

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Hola, {user?.email.split('@')[0]}</h1>
                    <p className="text-steel-400">Gestiona tus asistentes y canales activos</p>
                </div>
                <button onClick={logout} className="text-steel-400 hover:text-white transition-colors bg-navy-900 px-4 py-2 rounded-lg border border-glass-border">
                    Cerrar Sesión
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsModalOpen(true)}
                    className="premium-card border-dashed border-steel-500 flex flex-col items-center justify-center gap-4 text-steel-400 min-h-[220px]"
                >
                    <div className="p-3 bg-navy-800 rounded-full">
                        <Plus className="h-8 w-8" />
                    </div>
                    <span className="font-semibold text-lg">Nuevo Asistente</span>
                </motion.button>

                {assistants.map((ast) => (
                    <motion.div
                        key={ast.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="premium-card relative group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-600/20 text-accent-blue rounded-lg">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <button
                                onClick={() => setSelectedAssistant(ast)}
                                className="p-2 text-steel-500 hover:text-white transition-colors"
                                title="Configurar Canales"
                            >
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{ast.name}</h3>
                        <p className="text-steel-400 text-sm line-clamp-2 mb-6 h-10">{ast.personality}</p>

                        <div className="flex justify-between items-end">
                            <div className="flex gap-2">
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full" title="WhatsApp">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-full" title="Telegram">
                                    <Send className="h-4 w-4" />
                                </div>
                            </div>
                            <span className="text-[10px] font-mono bg-navy-800 px-2 py-1 rounded text-accent-light uppercase tracking-wider">
                                {ast.defaultLlm}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <section className="mb-20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="h-6 w-6 text-accent-light" />
                    Tareas Proactivas
                </h2>
                <div className="premium-card text-center py-12 text-steel-500 border-dashed">
                    Próximamente: Tu asistente podrá analizar tus correos, calendarios y más para ayudarte de forma proactiva.
                </div>
            </section>

            {/* Modals */}
            <CreateAssistantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchAssistants}
            />

            <AnimatePresence>
                {selectedAssistant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAssistant(null)}
                            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative h-full w-full max-w-md bg-navy-900 border-l border-glass-border p-8 shadow-2xl overflow-y-auto"
                        >
                            <button
                                onClick={() => setSelectedAssistant(null)}
                                className="absolute right-6 top-6 text-steel-500 hover:text-white"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <h2 className="text-2xl font-bold mb-2">Canales: {selectedAssistant.name}</h2>
                            <p className="text-steel-400 text-sm mb-8">Vincula los canales donde quieres que este asistente responda.</p>

                            <ChannelConnector assistantId={selectedAssistant.id} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardPage;
