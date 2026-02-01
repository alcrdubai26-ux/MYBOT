import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Brain, Cpu } from 'lucide-react';

interface CreateAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const CreateAssistantModal: React.FC<CreateAssistantModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [personality, setPersonality] = useState('Eres un asistente personal útil y eficiente.');
    const [llm, setLlm] = useState('gemini');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/assistants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, personality, defaultLlm: llm }),
            });
            if (res.ok) {
                onCreated();
                onClose();
                setName('');
            }
        } catch (err) {
            console.error('Failed to create assistant', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="premium-card relative w-full max-w-lg shadow-2xl"
                    >
                        <button onClick={onClose} className="absolute right-4 top-4 text-steel-500 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-accent-blue" />
                            Crear Nuevo Asistente
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-steel-400 block mb-2">Nombre del Asistente</label>
                                <div className="relative">
                                    <Brain className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-500" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg bg-navy-900 border border-glass-border py-3 pl-11 pr-4 text-white focus:border-accent-blue focus:outline-none"
                                        placeholder="Ej: BertIA, Jarvis..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-steel-400 block mb-2">Personalidad / Instrucciones</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={personality}
                                    onChange={(e) => setPersonality(e.target.value)}
                                    className="w-full rounded-lg bg-navy-900 border border-glass-border py-3 px-4 text-white focus:border-accent-blue focus:outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-steel-400 block mb-2">Modelo de Lenguaje (LLM)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['gemini', 'claude', 'gpt4', 'deepseek'].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setLlm(m)}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${llm === m
                                                    ? 'border-accent-blue bg-blue-600/10 text-white'
                                                    : 'border-glass-border bg-navy-900 text-steel-400 hover:border-steel-600'
                                                }`}
                                        >
                                            <Cpu className="h-4 w-4" />
                                            <span className="capitalize">{m}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary w-full disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creando...' : 'Crear Asistente'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateAssistantModal;
