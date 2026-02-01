import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Send, ChevronRight, QrCode, ShieldCheck } from 'lucide-react';

interface ChannelConnectorProps {
    assistantId: string;
}

const ChannelConnector: React.FC<ChannelConnectorProps> = ({ assistantId }) => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [tgToken, setTgToken] = useState('');
    const [connecting, setConnecting] = useState<string | null>(null);

    const connectWhatsApp = async () => {
        setConnecting('whatsapp');
        try {
            const res = await fetch('/api/channels/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assistantId }),
            });
            const data = await res.json();
            if (data.qr) setQrCode(data.qr);
        } catch (err) {
            console.error('WhatsApp connection failed', err);
        } finally {
            setConnecting(null);
        }
    };

    const connectTelegram = async () => {
        setConnecting('telegram');
        try {
            await fetch('/api/channels/telegram/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assistantId, token: tgToken }),
            });
            alert('Telegram bot conectado!');
        } catch (err) {
            console.error('Telegram connection failed', err);
        } finally {
            setConnecting(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* WhatsApp Section */}
            <div className="premium-card">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                            <Phone className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">WhatsApp</h3>
                            <p className="text-xs text-steel-400">Vincula tu cuenta personal</p>
                        </div>
                    </div>
                    {!qrCode && (
                        <button
                            onClick={connectWhatsApp}
                            disabled={connecting === 'whatsapp'}
                            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-sm rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {connecting === 'whatsapp' ? 'Iniciando...' : 'Vincular'}
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {qrCode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 py-4 bg-white/5 rounded-xl border border-glass-border"
                    >
                        <div className="bg-white p-4 rounded-xl">
                            {/* En una app real usaríamos una librería de QR */}
                            <div className="h-48 w-48 bg-gray-200 flex items-center justify-center text-navy-950 font-bold text-center p-4">
                                [QR CODE PLACEHOLDER]
                                <br />
                                {qrCode.substring(0, 20)}...
                            </div>
                        </div>
                        <p className="text-xs text-center text-steel-400 px-8">
                            Escanea el código QR desde WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Telegram Section */}
            <div className="premium-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                        <Send className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold">Telegram</h3>
                        <p className="text-xs text-steel-400">Conecta mediante un Bot Token</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Bot Token (de @BotFather)"
                        value={tgToken}
                        onChange={(e) => setTgToken(e.target.value)}
                        className="w-full rounded-lg bg-navy-900 border border-glass-border py-2 px-4 text-sm text-white focus:border-accent-blue focus:outline-none"
                    />
                    <button
                        onClick={connectTelegram}
                        disabled={!tgToken || connecting === 'telegram'}
                        className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2"
                    >
                        {connecting === 'telegram' ? 'Conectando...' : 'Conectar Bot'}
                        <ShieldCheck className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChannelConnector;
