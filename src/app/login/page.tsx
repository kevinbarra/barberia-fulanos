import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login/LoginForm";
import { getTenantSlug } from "@/lib/tenant";
import { Scissors } from "lucide-react";

const ROOT_DOMAIN = 'agendabarber.pro';

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ noredirect?: string; redirectTo?: string }>;
}) {
    const params = await searchParams;
    const noRedirect = params.noredirect === '1';

    // --- LÓGICA INTELIGENTE: Redirección automática ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Si el usuario ya está logueado Y no hay flag de noredirect, lo sacamos del login.
    // noredirect=1 viene de /admin cuando la sesión no es válida para evitar loop
    if (user && !noRedirect) {
        // Consultamos su rol y tenant para mandarlo a la página correcta
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants(slug, subscription_status)')
            .eq('id', user.id)
            .single();

        const userRole = profile?.role;
        const isSuperAdmin = userRole === 'super_admin';
        const isAdminOrStaff = userRole === 'owner' || userRole === 'staff' || isSuperAdmin;

        // Extraer tenant data
        let tenantSlug: string | null = null;
        let tenantStatus: string = 'active';
        if (profile?.tenants) {
            const tenantData = profile.tenants as unknown;
            if (typeof tenantData === 'object' && tenantData !== null) {
                if ('slug' in tenantData) {
                    tenantSlug = (tenantData as { slug: string }).slug;
                }
                if ('subscription_status' in tenantData) {
                    tenantStatus = (tenantData as { subscription_status: string }).subscription_status || 'active';
                }
            }
        }

        // Determinar si estamos en producción vía headers
        const headersList = await headers();
        const hostname = headersList.get('host') || '';
        const isProduction = hostname.includes(ROOT_DOMAIN);

        // Super Admin: Simple redirect logic
        // Only redirect to platform if on www/root
        // On any subdomain, just go to /admin (layout handles the rest)
        if (isSuperAdmin) {
            const isOnWww = hostname.startsWith('www.') || hostname === ROOT_DOMAIN;

            if (isOnWww) {
                return redirect('/admin/platform');
            }
            // On any subdomain (tenant or otherwise), just go to /admin
            return redirect('/admin');
        }

        // Si el tenant está suspendido, redirigir a /admin (mostrará pantalla de suspensión)
        // No hacer redirect cross-subdomain para evitar loops
        if (tenantStatus !== 'active') {
            return redirect('/admin');
        }

        // En producción, redirigir al subdominio correcto (solo para tenants activos)
        if (isProduction && tenantSlug && isAdminOrStaff) {
            if (!hostname.startsWith(`${tenantSlug}.`)) {
                return redirect(`https://${tenantSlug}.${ROOT_DOMAIN}/admin`);
            }
        }

        // Fallback: redirigir a ruta relativa
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