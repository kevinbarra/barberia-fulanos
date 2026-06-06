'use client';

import { useState, useRef } from 'react';
import { createTenant } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { Loader2, Building, User, Globe, Plus, Palette, CreditCard, Clock, Sparkles, UserX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TenantProvisioningForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [demoType, setDemoType] = useState<string>('none');
    const [brandColor, setBrandColor] = useState('#8b5cf6');
    const [logoUrl, setLogoUrl] = useState('');
    const [isExtractingColor, setIsExtractingColor] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const extractColorFromLogo = async () => {
        if (!logoUrl) {
            toast.error('Introduce primero una URL de logo válida.');
            return;
        }
        setIsExtractingColor(true);
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = logoUrl;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        setIsExtractingColor(false);
                        return;
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    
                    let rSum = 0, gSum = 0, bSum = 0, count = 0;
                    
                    for (let i = 0; i < imageData.length; i += 16) {
                        const r = imageData[i];
                        const g = imageData[i+1];
                        const b = imageData[i+2];
                        const a = imageData[i+3];
                        
                        if (a > 200 && !(r > 240 && g > 240 && b > 240) && !(r < 20 && g < 20 && b < 20)) {
                            rSum += r;
                            gSum += g;
                            bSum += b;
                            count++;
                        }
                    }
                    
                    if (count > 0) {
                        const rAvg = Math.round(rSum / count);
                        const gAvg = Math.round(gSum / count);
                        const bAvg = Math.round(bSum / count);
                        const toHex = (x: number) => {
                            const hex = x.toString(16);
                            return hex.length === 1 ? '0' + hex : hex;
                        };
                        const extractedHex = `#${toHex(rAvg)}${toHex(gAvg)}${toHex(bAvg)}`;
                        setBrandColor(extractedHex);
                        toast.success('Color extraído y sincronizado con el logo.');
                    } else {
                        toast.error('No se pudo identificar un color predominante.');
                    }
                } catch (e) {
                    console.error(e);
                    toast.error('Error al procesar el logo (CORS).');
                } finally {
                    setIsExtractingColor(false);
                }
            };
            img.onerror = () => {
                toast.error('No se pudo cargar la imagen del logo.');
                setIsExtractingColor(false);
            };
        } catch (error) {
            console.error(error);
            setIsExtractingColor(false);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            // Inject states into formData
            formData.set('brand_color', brandColor);
            formData.set('logo_url', logoUrl);
            if (demoMode) formData.set('demo_mode', 'true');
            if (demoType !== 'none') {
                formData.set('demo_type', demoType);
            }

            const res = await createTenant(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.message);
                formRef.current?.reset();
                setDemoMode(false);
                setDemoType('none');
                setBrandColor('#8b5cf6');
                setLogoUrl('');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-950 p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                        <Plus size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Nuevo Negocio</h2>
                </div>
                <p className="text-zinc-400 text-sm">Provisionar un nuevo tenant y configurar su entorno.</p>
            </div>

            <form ref={formRef} action={handleSubmit} className="p-6 space-y-6">

                {/* SECCIÓN 1: IDENTIDAD */}
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Datos del Negocio</label>
                    <div className="space-y-4">
                        <div className="relative">
                            <Building className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Nombre Comercial (ej. Master Barber)"
                                className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    name="slug"
                                    required
                                    placeholder="Slug (url)"
                                    className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
                                />
                            </div>

                            {/* Selector de Color */}
                            <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 pr-3">
                                <div className="absolute left-3.5 top-3.5 text-zinc-500 pointer-events-none">
                                    <Palette size={16} />
                                </div>
                                <input
                                    type="color"
                                    name="brand_color"
                                    value={brandColor}
                                    onChange={e => setBrandColor(e.target.value)}
                                    className="w-10 h-8 ml-9 border-none bg-transparent cursor-pointer p-0"
                                />
                                <span className="text-xs text-zinc-400 ml-2 font-bold uppercase tracking-wider">Color: {brandColor}</span>
                            </div>
                        </div>

                        {/* URL de Logo Opcional en Creación */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    name="logo_url"
                                    value={logoUrl}
                                    onChange={e => setLogoUrl(e.target.value)}
                                    placeholder="URL del Logo (Opcional - ej: https://ejemplo.com/logo.png)"
                                    className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
                                />
                            </div>
                            {logoUrl && (
                                <div className="flex items-center gap-3 bg-zinc-950/60 p-2.5 border border-zinc-800/40 rounded-xl">
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-center">
                                        <img src={logoUrl} alt="Preview" className="object-cover w-full h-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={extractColorFromLogo}
                                        disabled={isExtractingColor}
                                        className="flex-1 py-2 px-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                    >
                                        {isExtractingColor ? (
                                            <>
                                                <Loader2 className="animate-spin" size={12} /> Extrayendo...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={12} /> Obtener Color del Logo
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: CONFIGURACIÓN SAAS */}
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Configuración SaaS</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Plan */}
                        <div className="relative">
                            <CreditCard className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                            <select
                                name="plan"
                                className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm appearance-none cursor-pointer"
                            >
                                <option value="trial" className="bg-zinc-950">Prueba (14 días)</option>
                                <option value="basic" className="bg-zinc-950">Plan Básico</option>
                                <option value="pro" className="bg-zinc-950">Plan Pro</option>
                                <option value="enterprise" className="bg-zinc-950">Enterprise</option>
                            </select>
                        </div>

                        {/* Zona Horaria */}
                        <div className="relative">
                            <Clock className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                            <select
                                name="timezone"
                                defaultValue="America/Mexico_City"
                                className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm appearance-none cursor-pointer"
                            >
                                <option value="America/Mexico_City" className="bg-zinc-950">🇲🇽 Ciudad de México</option>
                                <option value="America/Tijuana" className="bg-zinc-950">🇲🇽 Tijuana</option>
                                <option value="America/Monterrey" className="bg-zinc-950">🇲🇽 Monterrey</option>
                                <option value="America/Hermosillo" className="bg-zinc-950">🇲🇽 Hermosillo</option>
                                <option value="America/Cancun" className="bg-zinc-950">🇲🇽 Cancún</option>
                                <option value="America/Santo_Domingo" className="bg-zinc-950">🇩🇴 Rep. Dominicana</option>
                                <option value="America/Bogota" className="bg-zinc-950">🇨🇴 Colombia / Perú</option>
                                <option value="America/Santiago" className="bg-zinc-950">🇨🇱 Chile</option>
                                <option value="America/Argentina/Buenos_Aires" className="bg-zinc-950">🇦🇷 Argentina</option>
                                <option value="Europe/Madrid" className="bg-zinc-950">🇪🇸 España (Madrid)</option>
                                <option value="America/New_York" className="bg-zinc-950">🇺🇸 USA Este (NY/Miami)</option>
                                <option value="America/Chicago" className="bg-zinc-950">🇺🇸 USA Centro (Texas)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: DUEÑO */}
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dueño (Owner)</label>

                    {/* Demo Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setDemoMode(!demoMode)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            demoMode
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner'
                                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                        <UserX size={16} className={demoMode ? 'text-amber-400' : 'text-zinc-500'} />
                        <span className="text-xs font-bold uppercase tracking-wider flex-1 text-left">Modo Demo (sin dueño real)</span>
                        <div className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${
                            demoMode ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'
                        }`}>
                            <div className="w-4 h-4 rounded-full bg-zinc-950 shadow-sm" />
                        </div>
                    </button>

                    {demoMode ? (
                        <div className="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 flex gap-2">
                            <span>⚡</span>
                            <span>
                                Se creará sin dueño vinculado. Podrás asignar el email real más adelante desde el panel administrativo.
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <User className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
                                <input
                                    type="email"
                                    name="owner_email"
                                    required={!demoMode}
                                    placeholder="Email del Dueño"
                                    className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-medium"
                                />
                            </div>
                            <div className="text-xs text-blue-400 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 flex gap-2">
                                <span>ℹ️</span>
                                <span>
                                    Si el usuario existe, se le asigna el negocio. Si no existe, el sistema guardará el registro pendiente hasta que se registre.
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* SECCIÓN 4: GIRO Y DATOS DE PRUEBA */}
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} className="text-violet-400" />
                        Giro y Semilla de Datos (Demo)
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setDemoType('none')}
                            className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 ${
                                demoType === 'none'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-md shadow-amber-500/5'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>Vacío (Blanco)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDemoType('barbershop')}
                            className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 ${
                                demoType === 'barbershop'
                                    ? 'border-violet-500 bg-violet-500/10 text-violet-400 shadow-md shadow-violet-500/5'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>💈 Barbería</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDemoType('salon')}
                            className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 ${
                                demoType === 'salon'
                                    ? 'border-pink-500 bg-pink-500/10 text-pink-400 shadow-md shadow-pink-500/5'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>💇‍♀️ Estética / Salón</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDemoType('nails')}
                            className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 ${
                                demoType === 'nails'
                                    ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400 shadow-md shadow-fuchsia-500/5'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>💅 Uñas / Nails</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDemoType('skincare')}
                            className={`col-span-2 p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 ${
                                demoType === 'skincare'
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/5'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}
                        >
                            <span>✨ Skin Care / Spa</span>
                        </button>
                    </div>

                    {demoType !== 'none' && (
                        <div className="text-xs text-violet-400 bg-violet-500/5 p-3 rounded-xl border border-violet-500/10 animate-in fade-in slide-in-from-top-2 flex gap-2">
                            <span>✨</span>
                            <span>
                                Se inyectará automáticamente un catálogo de servicios, categorías, personal de staff y citas ficticias de prueba.
                            </span>
                        </div>
                    )}
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black py-4 rounded-xl shadow-lg hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} /> Provisionando...
                        </>
                    ) : (
                        'Crear Barbería Automática 🚀'
                    )}
                </motion.button>
            </form>
        </div>
    );
}
