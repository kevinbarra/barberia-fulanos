import { createClient, getTenantId } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import TransactionList from "@/components/admin/TransactionList";
import { getTodayRange } from "@/lib/dates";

export default async function AdminDashboard() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Obtener perfil completo
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, tenants(slug)")
        .eq("id", user?.id)
        .single();

    const userName = profile?.full_name?.split(" ")[0] || "Staff";
    const userRole = profile?.role || 'staff';

    // 2. Fechas
    const { startISO, endISO } = getTodayRange();

    // 3. KPI Financiero (SOLO OWNER)
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

    // 4. KPI Citas
    const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: 'exact', head: true })
        .eq("tenant_id", tenantId)
        .gte("start_time", startISO)
        .lte("start_time", endISO);

    // 5. Transacciones (Seguridad vía RLS, sin filtro JS)
    const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select(`
            id, amount, created_at, client_id, points_earned, 
            services(name)
        `)
        .eq("tenant_id", tenantId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

    if (error) console.error("Error fetching transactions:", error);

    const formattedTransactions = transactionsData?.map(t => ({
        id: t.id,
        amount: t.amount,
        created_at: t.created_at,
        client_id: t.client_id,
        points_earned: t.points_earned,
        // @ts-ignore
        service_name: t.services?.name || 'Venta Rápida'
    })) || [];

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

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

            {/* KPIS */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {userRole === 'owner' ? (
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
                ) : (
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

            {/* ACTIVIDAD */}
            <div className="mb-8">
                <h3 className="text-gray-900 font-bold text-lg mb-3">
                    {userRole === 'owner' ? 'Actividad Global del Día' : 'Mis Cobros Recientes'}
                </h3>
                <TransactionList transactions={formattedTransactions} />
            </div>

            {/* MENÚ CORREGIDO */}
            <h3 className="text-gray-900 font-bold text-lg mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link href="/admin/bookings" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-black transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">🗓️</div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Agenda</h3>
                            <p className="text-gray-400 text-xs">Gestionar citas</p>
                        </div>
                    </div>
                </Link>

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

                        <Link href="/admin/services" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:border-orange-500 transition-all active:scale-[0.98]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl">✂️</div>
                                <div>
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