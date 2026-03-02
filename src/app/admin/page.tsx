import { createClient, getTenantId } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import TransactionList from "@/components/admin/TransactionList";
import { getTodayRange } from "@/lib/dates";
import { headers } from "next/headers";
import KioskStatusCard from "@/components/admin/KioskStatusCard";
import { ROOT_DOMAIN, extractTenantSlug } from "@/lib/constants";

export default async function AdminDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, tenant_id, tenants(slug)")
        .eq("id", user.id)
        .single();

    const userRole = profile?.role || 'staff';
    const isSuperAdmin = userRole === 'super_admin';

    // Get tenant ID - for super admin, get from subdomain; for others, get from profile
    let tenantId = profile?.tenant_id;

    if (isSuperAdmin) {
        const headersList = await headers();
        const hostname = headersList.get('host') || '';
        const currentSubdomain = extractTenantSlug(hostname);

        if (currentSubdomain) {
            // Super admin on tenant subdomain - fetch tenant ID from subdomain
            const { data: subdomainTenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', currentSubdomain)
                .single();

            tenantId = subdomainTenant?.id || null;
        }
    }

    if (!tenantId) return redirect("/login");

    // Kiosk mode is now handled by KioskStatusCard client component
    // No server-side cookie reading needed

    const userName = profile?.full_name?.split(" ")[0] || "Staff";

    const { startISO, endISO } = getTodayRange();

    let totalIncome = 0;
    if (userRole === 'owner') {
        const { data: allTransactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("tenant_id", tenantId)
            .gte("created_at", startISO)
            .lte("created_at", endISO);

        totalIncome = allTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    }

    const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: 'exact', head: true })
        .eq("tenant_id", tenantId)
        .gte("start_time", startISO)
        .lte("start_time", endISO);

    const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select(`
            id, amount, created_at, client_id, points_earned, notes,
            services(name)
        `)
        .eq("tenant_id", tenantId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

    const formattedTransactions = transactionsData?.map(t => {
        const services = t.services as unknown as Record<string, string> | null;
        return {
            id: t.id,
            amount: t.amount,
            created_at: t.created_at,
            client_id: t.client_id,
            points_earned: t.points_earned,
            service_name: (services?.name as string) || 'Venta Rápida'
        };
    }) || [];

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

    const autoCompletedTransactions = transactionsData?.filter(t => t.notes?.includes('Auto-completado')) || [];
    const autoCompletedCount = autoCompletedTransactions.length;
    const autoCompletedIncome = autoCompletedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32">

            <div className="mb-8 mt-2 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hola, {userName}</h1>
                    <p className="text-gray-500 text-sm font-medium">
                        {userRole === 'owner' ? 'Panel Gerencial' : 'Panel de Barbero'}
                    </p>
                </div>
            </div>

            {userRole === 'owner' && autoCompletedCount > 0 && (
                <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                            ⚡
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 text-sm mb-0.5">Modo Ágil Activo</h3>
                            <p className="text-amber-700 text-xs font-medium">
                                Hoy el sistema procesó <strong className="font-black text-amber-900">{autoCompletedCount}</strong> {autoCompletedCount === 1 ? 'cita' : 'citas'} automáticamente (<span className="font-black text-amber-900">{formatMoney(autoCompletedIncome)}</span>)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Kiosk Status Card - only shows for tablet user when kiosk is active */}
                <KioskStatusCard />

                {userRole === 'owner' && (
                    <div className="bg-black text-white p-5 rounded-2xl shadow-xl flex flex-col justify-between h-36 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-zinc-800 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                        <div className="flex justify-between items-start z-10">
                            <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Caja Hoy</p>
                            <span className="text-xl">💰</span>
                        </div>
                        <div className="z-10">
                            <h2 className="text-3xl font-black tracking-tight">{formatMoney(totalIncome)}</h2>
                            <p className="text-zinc-500 text-xs mt-1">Total acumulado</p>
                        </div>
                    </div>
                )}
                {userRole !== 'owner' && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                        <div className="flex justify-between items-start">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Tus Cortes</p>
                            <span className="text-xl">✂️</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-gray-900">{formattedTransactions.length}</h2>
                            <p className="text-gray-500 text-xs mt-1">Servicios hoy</p>
                        </div>
                    </div>
                )}

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Agenda Total</p>
                        <span className="text-xl">📅</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1">
                            <h2 className="text-3xl font-black text-gray-900">{bookingsCount || 0}</h2>
                            <span className="text-gray-500 text-sm font-medium">citas</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Programadas hoy</p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-gray-900 font-bold text-lg mb-3">
                    {userRole === 'owner' ? 'Actividad Global del Día' : 'Mis Cobros Recientes'}
                </h3>
                <TransactionList transactions={formattedTransactions} />
            </div>

            <h3 className="text-gray-900 font-bold text-lg mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. AGENDA */}
                <Link href="/admin/bookings" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-black transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">🗓️</div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Agenda</h3>
                            <p className="text-gray-400 text-xs">Gestionar citas</p>
                        </div>
                    </div>
                </Link>

                {/* 2. POS */}
                <Link href="/admin/pos" className="bg-black p-4 rounded-2xl shadow-lg border border-zinc-800 flex items-center justify-between hover:bg-zinc-800 transition-all active:scale-[0.98] group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 text-white rounded-xl flex items-center justify-center text-2xl group-hover:bg-zinc-700">🛒</div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Terminal POS</h3>
                            <p className="text-zinc-400 text-xs">Cobrar a clientes</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">→</div>
                </Link>

                {/* 3. HORARIOS (VISIBLE PARA TODOS) */}
                <Link href="/admin/schedule" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-teal-500 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-2xl">⏰</div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Horarios</h3>
                            <p className="text-gray-400 text-xs">Gestionar disponibilidad</p>
                        </div>
                    </div>
                </Link>

                {/* 4. GASTOS (VISIBLE PARA TODOS) */}
                <Link href="/admin/expenses" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-green-500 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-2xl">💸</div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Gastos</h3>
                            <p className="text-gray-400 text-xs">Registrar salidas</p>
                        </div>
                    </div>
                </Link>

                {/* OWNER-ONLY LINKS */}
                {/* KioskRouteGuard protects these routes if kiosk is active */}
                {userRole === 'owner' && (
                    <>
                        <Link href="/admin/team" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-purple-500 transition-all active:scale-[0.98]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">👥</div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Equipo</h3>
                                    <p className="text-gray-400 text-xs">Gestionar acceso</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/admin/services" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center items-center gap-2 hover:border-orange-500 transition-all active:scale-[0.98] text-center md:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-4 w-full">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl">✂️</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-lg text-gray-900">Servicios</h3>
                                    <p className="text-gray-400 text-xs">Catálogo</p>
                                </div>
                            </div>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}