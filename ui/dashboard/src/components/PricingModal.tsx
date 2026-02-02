import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Rocket, Shield } from 'lucide-react';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
    const handleUpgrade = async (plan: 'pro' | 'max') => {
        try {
            const res = await fetch('/api/billing/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Failed to create checkout session:', err);
        }
    };

    const plans = [
        {
            name: 'Free',
            price: '0€',
            description: 'Para probar AMUN',
            features: ['1 Asistente', 'Memoria limitada', 'Email básico'],
            icon: <Zap className="h-6 w-6 text-steel-400" />,
            buttonText: 'Plan Actual',
            disabled: true,
        },
        {
            name: 'Pro',
            price: '29€',
            description: 'Para profesionales',
            features: ['Asistentes ilimitados', 'Memoria extendida', 'WhatsApp & Telegram', 'Búsqueda Web'],
            icon: <Rocket className="h-6 w-6 text-accent-light" />,
            buttonText: 'Actualizar a Pro',
            highlight: true,
        },
        {
            name: 'Max',
            price: '99€',
            description: 'Jarvis completo',
            features: ['Todas las funciones Pro', 'Playwright Browser', 'Soporte prioritario', 'MCP Skills ilimitados'],
            icon: <Shield className="h-6 w-6 text-accent-blue" />,
            buttonText: 'Obtener Max',
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-navy-950/90 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-5xl bg-navy-900 border border-glass-border rounded-3xl p-8 shadow-2xl overflow-hidden"
                    >
                        <button onClick={onClose} className="absolute right-6 top-6 text-steel-500 hover:text-white transition-colors">
                            <X className="h-6 w-6" />
                        </button>

                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold mb-4">Lleva a AMUN al siguiente nivel</h2>
                            <p className="text-steel-400">Escoge el plan que mejor se adapte a tus necesidades</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`relative p-8 rounded-2xl border ${plan.highlight ? 'border-accent-light bg-accent-light/5' : 'border-glass-border bg-navy-800/50'} flex flex-col`}
                                >
                                    {plan.highlight && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-light text-navy-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                            Recomendado
                                        </div>
                                    )}
                                    <div className="mb-6">{plan.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <div className="text-3xl font-bold mb-2">{plan.price}<span className="text-lg text-steel-500 font-normal">/mes</span></div>
                                    <p className="text-steel-400 text-sm mb-6">{plan.description}</p>

                                    <ul className="space-y-4 mb-8 flex-1">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-3 text-sm text-steel-300">
                                                <Check className="h-4 w-4 text-accent-light flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        disabled={plan.disabled}
                                        onClick={() => handleUpgrade(plan.name.toLowerCase() as any)}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${plan.disabled
                                                ? 'bg-navy-700 text-steel-500 cursor-not-allowed'
                                                : plan.highlight
                                                    ? 'bg-accent-light text-navy-950 hover:shadow-lg hover:shadow-accent-light/20 scale-105'
                                                    : 'bg-navy-800 text-white hover:bg-navy-700'
                                            }`}
                                    >
                                        {plan.buttonText}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PricingModal;
