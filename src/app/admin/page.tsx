import { createClient, getTenantId } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    // 1. Obtener usuario para el saludo
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, tenants(slug)")
        .eq("id", user?.id)
        .single();

    const userName = profile?.full_name?.split(" ")[0] || "Jefe";
    // @ts-ignore
    const tenantSlug = profile?.tenants?.slug || "fulanos";

    // --- LÓGICA DE BI (Business Intelligence) ---

    // 2. Definir rango de tiempo: HOY (Local Server Time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 3. Consultar DINERO de HOY
    const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

    // 4. Consultar CITAS de HOY
    const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: 'exact', head: true })
        .eq("tenant_id", tenantId)
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString());

    // 5. Calcular Totales
    const totalIncome = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* HEADER */}
            <div className="mb-6 mt-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hola, {userName} 👋</h1>
                    <p className="text-gray-500 text-sm">Resumen de hoy</p>
                </div>
                <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    En vivo
                </div>
            </div>

            {/* --- KPIS (MÉTRICAS) --- */}
            <div className="grid grid-cols-2 gap-4 mb-8">

                {/* KPI 1: DINERO (Caja) */}
                <div className="bg-black text-white p-5 rounded-2xl shadow-xl flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Ventas Hoy</p>
                        <span className="text-xl">💰</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">{formatMoney(totalIncome)}</h2>
                        <p className="text-gray-500 text-xs mt-1">Acumulado</p>
                    </div>
                </div>

                {/* KPI 2: CITAS (Volumen) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Citas Hoy</p>
                        <span className="text-xl">📅</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <h2 className="text-3xl font-black text-gray-900">{bookingsCount || 0}</h2>
                        <span className="text-gray-500 text-sm font-medium">reservas</span>
                    </div>
                </div>

            </div>

            {/* --- MENÚ DE NAVEGACIÓN (Botones grandes) --- */}
            <h3 className="text-gray-900 font-bold text-lg mb-4">Menú Rápido</h3>
            <div className="grid grid-cols-1 gap-4">

                <Link
                    href="/admin/bookings"
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all group active:scale-95"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                            🗓️
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Agenda</h3>
                            <p className="text-gray-400 text-xs">Gestionar citas</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">→</div>
                </Link>

                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href="/admin/services"
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-black transition-all active:scale-95"
                    >
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 text-xl">✂️</div>
                        <h3 className="font-bold text-gray-900 text-sm">Servicios</h3>
                    </Link>

                    <Link
                        href="/admin/schedule"
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-black transition-all active:scale-95"
                    >
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-3 text-xl">⏰</div>
                        <h3 className="font-bold text-gray-900 text-sm">Horarios</h3>
                    </Link>
                </div>

                {/* LINK PÚBLICO */}
                <div className="mt-2">
                    <Link
                        href={`/book/${tenantSlug}`}
                        target="_blank"
                        className="flex w-full items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-bold active:scale-95"
                    >
                        <span>👁️</span> Ver mi página web
                    </Link>
                </div>

            </div>
        </div>
    );
}