'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateInstantDemo } from './actions';
import { toast } from 'sonner';
import {
    Sparkles,
    Building2,
    Scissors,
    Wand2,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEED_TEMPLATES } from '@/lib/seed-templates';

export default function DemoGeneratorPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState<string>('barbershop');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!businessName) {
            toast.error("Por favor, ingresa el nombre del negocio");
            return;
        }

        setIsGenerating(true);
        const loadingToast = toast.loading("Fabricando demo... Esto tomará unos segundos");

        try {
            const formData = new FormData();
            formData.append('businessName', businessName);
            formData.append('businessType', businessType);

            const result = await generateInstantDemo(formData);

            if (result.error) {
                toast.error(result.error, { id: loadingToast });
                setIsGenerating(false);
                return;
            }

            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">¡Demo Creada Exitosamente!</span>
                    <span className="text-sm opacity-90">Redirigiendo al panel del nuevo tenant...</span>
                </div>,
                { id: loadingToast, duration: 4000 }
            );

            // Wait a bit to let user see success, then route to the new domain or panel
            setTimeout(() => {
                // If the app runs on subdomains normally: window.location.href = `https://${result.slug}.fulanos.com/admin`
                // But for local/general dev, just routing them to /admin might re-resolve tenant based on user.
                // Or we can just refresh to allow them to pick the tenant if they are super admin.
                router.push('/admin');
            }, 2000);

        } catch (error) {
            toast.error("Error inesperado", { id: loadingToast });
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-100px)] p-6 md:p-10 flexitems-center justify-center bg-gray-50/50">
            <div className="max-w-2xl mx-auto w-full">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-xl shadow-indigo-500/20">
                        <Wand2 className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-3">
                        Instant Demo Factory
                    </h1>
                    <p className="text-lg text-gray-500">
                        Genera un entorno de prueba 100% funcional y poblado de datos en menos de 10 segundos.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
                    <form onSubmit={handleGenerate} className="space-y-8">

                        {/* Business Name */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Building2 size={16} className="text-gray-400" />
                                Nombre del Negocio Prospecto
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Ej. Nails & Shine Las Lomas"
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-300"
                                required
                            />
                        </div>

                        {/* Business Type Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Scissors size={16} className="text-gray-400" />
                                Giro y Plantilla de Datos
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(SEED_TEMPLATES).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setBusinessType(type)}
                                        className={cn(
                                            "flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all",
                                            businessType === type
                                                ? "border-purple-600 bg-purple-50/50"
                                                : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full mb-2">
                                            <span className="font-black text-gray-900 capitalize text-lg">
                                                {type === 'skincare' ? 'Skin Care' : type}
                                            </span>
                                            {businessType === type && (
                                                <CheckCircle2 size={20} className="text-purple-600" />
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium">
                                            {SEED_TEMPLATES[type].services.length} servicios • {SEED_TEMPLATES[type].staff.length} staff
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isGenerating || !businessName}
                                className="w-full relative group overflow-hidden bg-gray-900 text-white p-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-gray-900/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                                <span className="flex items-center justify-center gap-3 relative z-10">
                                    {isGenerating ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Generando Magia...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} className="text-yellow-400" />
                                            ¡Generar Magia!
                                        </>
                                    )}
                                </span>
                            </button>
                            <p className="text-center text-xs text-gray-400 font-medium mt-4">
                                Esta acción creará un nuevo tenant completo en la base de datos de producción.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
