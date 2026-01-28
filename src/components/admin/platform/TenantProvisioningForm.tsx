'use client';

import { useState, useRef } from 'react';
import { createTenant } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { Loader2, Building, User, Globe, Plus, Palette, CreditCard, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TenantProvisioningForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null); // Referencia para resetear el form

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            const res = await createTenant(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.message);
                formRef.current?.reset(); // Limpia el formulario al terminar
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

                {/* SECCIÓN 2: CONFIGURACIÓN SAAS (NUEVO) */}
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
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="email"
                            name="owner_email"
                            required
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
