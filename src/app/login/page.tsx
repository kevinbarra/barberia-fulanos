import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login/LoginForm";
import { getTenantSlug } from "@/lib/tenant";
import { Scissors } from "lucide-react";

const ROOT_DOMAIN = 'agendabarber.pro';

export default async function LoginPage() {
    // --- LÓGICA INTELIGENTE: Redirección automática ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Si el usuario ya está logueado, lo sacamos del login.
    if (user) {
        // Consultamos su rol y tenant para mandarlo a la página correcta
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants(slug)')
            .eq('id', user.id)
            .single();

        const isAdminOrStaff = profile?.role === 'owner' || profile?.role === 'staff' || profile?.role === 'super_admin';

        // Extraer tenant slug
        let tenantSlug: string | null = null;
        if (profile?.tenants) {
            const tenantData = profile.tenants as unknown;
            if (typeof tenantData === 'object' && tenantData !== null && 'slug' in tenantData) {
                tenantSlug = (tenantData as { slug: string }).slug;
            }
        }

        // Determinar si estamos en producción vía headers
        const headersList = await headers();
        const hostname = headersList.get('host') || '';
        const isProduction = hostname.includes(ROOT_DOMAIN);

        // En producción, redirigir al subdominio correcto
        if (isProduction && tenantSlug && isAdminOrStaff) {
            // Check if already on correct subdomain
            if (!hostname.startsWith(`${tenantSlug}.`)) {
                return redirect(`https://${tenantSlug}.${ROOT_DOMAIN}/admin`);
            }
        }

        // Fallback: redirigir a ruta relativa (funciona en desarrollo o si ya está en subdominio)
        return redirect(isAdminOrStaff ? '/admin' : '/app');
    }
    // --------------------------------------------------

    // Detectar contexto de dominio
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const tenantSlug = await getTenantSlug();

    const isRootDomain = hostname === 'agendabarber.pro' ||
        hostname === 'www.agendabarber.pro' ||
        (!tenantSlug && hostname.includes('vercel.app'));

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Fondo Ambiental */}
            <div className={`absolute top-[-20%] right-[-20%] w-[60%] h-[60%] ${isRootDomain ? 'bg-amber-600/10' : 'bg-blue-600/10'} blur-[100px] rounded-full pointer-events-none`}></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-sm z-10">

                {/* Header con Navegación */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="text-zinc-500 text-xs font-bold hover:text-white mb-6 inline-block transition-colors"
                    >
                        ← Volver al inicio
                    </Link>

                    {isRootDomain ? (
                        <>
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                                    <Scissors className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-black text-xl">AgendaBarber</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight mb-2">Inicia Sesión</h1>
                            <p className="text-zinc-400 text-sm">Accede a tu panel de administración.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl font-black tracking-tight mb-2">Bienvenido</h1>
                            <p className="text-zinc-400 text-sm">Ingresa para gestionar tus citas.</p>
                        </>
                    )}
                </div>

                {/* FORMULARIO CLIENTE (Interactivo) */}
                <LoginForm />

                <p className="text-center text-zinc-600 text-xs mt-8">
                    Código de un solo uso. Seguro y sin contraseñas.
                </p>

            </div>
        </div>
    )
}