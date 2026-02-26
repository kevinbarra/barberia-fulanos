'use client';

import { useState, useRef } from 'react';
import { createTenant } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { Loader2, Building, User, Globe, Plus, Palette, CreditCard, Clock, Sparkles, UserX, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TenantProvisioningForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [showcaseMode, setShowcaseMode] = useState(false);
    const [showcaseBarbers, setShowcaseBarbers] = useState(2);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            // Inject toggle states into formData
            if (demoMode) formData.set('demo_mode', 'true');
            if (showcaseMode) {
                formData.set('showcase_mode', 'true');
                formData.set('showcase_barbers', String(showcaseBarbers));
            }

            const res = await createTenant(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.message);
                formRef.current?.reset();
                setDemoMode(false);
                setShowcaseMode(false);
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-zinc-900 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Plus size={24} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold">Nuevo Negocio</h2>
                </div>
                <p className="text-zinc-400 text-sm">Provisionar un nuevo tenant y asignar dueño.</p>
            </div>

            <form ref={formRef} action={handleSubmit} className="p-6 space-y-6">

                {/* SECCIÓN 1: IDENTIDAD */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Datos del Negocio</label>
                    <div className="space-y-4">
                        <div className="relative">
                            <Building className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Nombre Comercial (ej. Master Barber)"
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Globe className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="slug"
                                    required
                                    placeholder="Slug (url)"
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-sm font-mono"
                                />
                            </div>

                            {/* Selector de Color */}
                            <div className="relative flex items-center border border-gray-200 rounded-xl p-1 pr-3">
                                <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                                    <Palette size={18} />
                                </div>
                                <input
                                    type="color"
                                    name="brand_color"
                                    defaultValue="#8b5cf6"
                                    className="w-10 h-8 ml-9 border-none bg-transparent cursor-pointer p-0"
                                />
                                <span className="text-sm text-gray-500 ml-2">Color de Marca</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: CONFIGURACIÓN SAAS */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Configuración SaaS</label>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Plan */}
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                name="plan"
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm bg-white appearance-none cursor-pointer"
                            >
                                <option value="trial">Prueba (14 días)</option>
                                <option value="basic">Plan Básico</option>
                                <option value="pro">Plan Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>

                        {/* Zona Horaria */}
                        <div className="relative">
                            <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                                name="timezone"
                                defaultValue="America/Mexico_City"
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm bg-white appearance-none cursor-pointer"
                            >
                                <option value="America/Mexico_City">🇲🇽 Ciudad de México</option>
                                <option value="America/Tijuana">🇲🇽 Tijuana</option>
                                <option value="America/Monterrey">🇲🇽 Monterrey</option>
                                <option value="America/Hermosillo">🇲🇽 Hermosillo</option>
                                <option value="America/Cancun">🇲🇽 Cancún</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: DUEÑO */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dueño (Owner)</label>

                    {/* Demo Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setDemoMode(!demoMode)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all mb-3 ${demoMode
                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <UserX size={18} className={demoMode ? 'text-amber-600' : 'text-gray-400'} />
                        <span className="text-sm font-semibold flex-1 text-left">Modo Demo (sin dueño real)</span>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${demoMode ? 'bg-amber-400 justify-end' : 'bg-gray-300 justify-start'
                            }`}>
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                    </button>

                    {demoMode ? (
                        <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex gap-2">
                            <span>⚡</span>
                            <span>
                                Se creará sin dueño vinculado. Podrás asignar el email real más adelante desde la plataforma.
                            </span>
                        </p>
                    ) : (
                        <>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    name="owner_email"
                                    required={!demoMode}
                                    placeholder="Email del Dueño"
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-sm font-medium"
                                />
                            </div>
                            <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100 flex gap-2">
                                <span>ℹ️</span>
                                <span>
                                    Si el usuario existe, se le asigna el negocio.
                                    <br />
                                    Si no existe, el sistema lo deja pendiente hasta que se registre.
                                </span>
                            </p>
                        </>
                    )}
                </div>

                {/* SECCIÓN 4: SHOWCASE MODE */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Datos de Muestra</label>

                    <button
                        type="button"
                        onClick={() => setShowcaseMode(!showcaseMode)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${showcaseMode
                                ? 'border-violet-400 bg-violet-50 text-violet-800'
                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <Sparkles size={18} className={showcaseMode ? 'text-violet-600' : 'text-gray-400'} />
                        <span className="text-sm font-semibold flex-1 text-left">Poblar con barberos demo</span>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${showcaseMode ? 'bg-violet-500 justify-end' : 'bg-gray-300 justify-start'
                            }`}>
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                    </button>

                    {showcaseMode && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 space-y-3"
                        >
                            <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
                                <Users size={16} className="text-violet-600" />
                                <span className="text-sm text-violet-700 font-medium">Barberos:</span>
                                <div className="flex gap-2 ml-auto">
                                    {[2, 3, 4].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setShowcaseBarbers(n)}
                                            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${showcaseBarbers === n
                                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                                                    : 'bg-white text-violet-600 border border-violet-200 hover:bg-violet-100'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-violet-600 bg-violet-50/50 p-2 rounded-lg border border-violet-100">
                                ✨ Se crearán {showcaseBarbers} barberos con nombres genéricos, horarios L-S (10:00–20:00) y los 5 servicios estándar. Listo para demo en segundos.
                            </p>
                        </motion.div>
                    )}
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Crear Barbería Automática 🚀'}
                </motion.button>
            </form>
        </div>
    );
}
