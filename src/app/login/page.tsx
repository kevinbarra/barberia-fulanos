import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login/LoginForm";
import { getTenantSlug } from "@/lib/tenant";
import { Scissors } from "lucide-react";
import { ROOT_DOMAIN, isRootDomain as isRootDomainCheck } from "@/lib/constants";

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
        if (isSuperAdmin) {
            const isOnWww = hostname.startsWith('www.') || hostname === ROOT_DOMAIN;

            if (isOnWww) {
                return redirect('/admin/platform');
            }

            // On tenant/custom subdomain: Show manual button to break loop
            // This confirms session exists on this subdomain
            return (
                <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                    <div className="z-10 w-full max-w-sm text-center">
                        <h1 className="text-3xl font-black mb-4">Super Admin</h1>
                        <p className="text-zinc-400 mb-8">Sesión activa detectada en subdominio.</p>

                        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mb-6">
                            <p className="text-sm font-medium text-zinc-300 mb-4">Estás en: <span className="text-white">{hostname}</span></p>
                            <a
                                href="/admin"
                                className="block w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                            >
                                Acceder al Panel
                            </a>
                        </div>

                        <Link href={`https://www.${ROOT_DOMAIN}/admin/platform`} className="text-xs text-zinc-500 hover:text-white underline">
                            Volver a Platform (WWW)
                        </Link>
                    </div>
                </div>
            );
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

    // Use imported helper function for root domain detection
    const isRootDomain = isRootDomainCheck(hostname) ||
        (!tenantSlug && hostname.includes('vercel.app'));

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex">

            {/* LEFT SIDE - Brand Panel (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black items-center justify-center p-12 overflow-hidden">
                {/* Ambient Background */}
                <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-orange-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                {/* Content */}
                <div className="relative z-10 max-w-md text-center lg:text-left">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20">
                            <Scissors className="w-7 h-7 text-white" />
                        </div>
                        <span className="font-black text-3xl tracking-tight">AgendaBarber</span>
                    </div>

                    {/* Tagline */}
                    <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight">
                        Tu barbería,<br />
                        <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                            siempre lista.
                        </span>
                    </h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        Gestiona citas, clientes y reportes desde un solo lugar. Sin complicaciones.
                    </p>

                    {/* Trust Badges */}
                    <div className="mt-12 flex items-center gap-6 justify-center lg:justify-start">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-sm">Sin contraseñas</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <span className="text-sm">100% Seguro</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Form Panel */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden">
                {/* Mobile Ambient (Only visible on mobile) */}
                <div className="lg:hidden absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="lg:hidden absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="w-full max-w-sm z-10">
                    {/* Mobile Logo (Only visible on mobile) */}
                    <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                            <Scissors className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-xl">AgendaBarber</span>
                    </div>

                    {/* Back Link */}
                    <Link
                        href="/"
                        className="text-zinc-500 text-xs font-bold hover:text-white mb-6 inline-flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver al inicio
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        {isRootDomain ? (
                            <>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">Inicia Sesión</h1>
                                <p className="text-zinc-400">Accede a tu panel de administración.</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">Bienvenido</h1>
                                <p className="text-zinc-400">Ingresa para gestionar tus citas.</p>
                            </>
                        )}
                    </div>

                    {/* Form */}
                    <LoginForm />

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-zinc-600 text-xs flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Código de un solo uso. Seguro y sin contraseñas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}