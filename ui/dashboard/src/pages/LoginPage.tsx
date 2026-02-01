import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout, Mail, Lock, ArrowRight, Github } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const endpoint = isLogin ? '/api/login' : '/api/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                login(data);
                navigate('/');
            } else {
                const errData = await res.json();
                setError(errData.message || 'Error en la autenticación');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card w-full max-w-md"
            >
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400">
                        <Layout className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold">Moltbot</h1>
                    <p className="text-steel-400 mt-2">Tu Agente Personal de IA</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-steel-300">Email</label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-500" />
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg bg-navy-900 border border-glass-border py-3 pl-11 pr-4 text-white focus:border-accent-blue focus:outline-none"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-steel-300">Contraseña</label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-500" />
                            <input
                                type="password"
                                required
                                className="w-full rounded-lg bg-navy-900 border border-glass-border py-3 pl-11 pr-4 text-white focus:border-accent-blue focus:outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 group">
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-steel-400 hover:text-white text-sm"
                    >
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
