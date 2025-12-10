import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TenantProvisioningForm from "@/components/admin/platform/TenantProvisioningForm";
import TenantListItem from "@/components/admin/platform/TenantListItem";
import Link from "next/link";
import {
    ShieldAlert,
    Building2,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Search,
    Plus
} from "lucide-react";
import { getPlatformStats } from "./actions";

export default async function PlatformPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string; q?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const params = await searchParams;

    if (!user) return redirect("/login");

    // Validar Rol Super Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <ShieldAlert size={48} className="text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
                <p className="text-gray-600 mb-8 max-w-md">
                    Esta área es exclusiva para la administración de la plataforma SaaS.
                </p>
                <Link
                    href="/admin"
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                >
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    // Obtener stats y lista de tenants
    const stats = await getPlatformStats();

    // Filtro y búsqueda
    const filter = params.filter || 'all';
    const searchQuery = params.q || '';

    let tenantsQuery = supabase.from('tenants').select('*').order('created_at', { ascending: false });

    if (filter === 'active') {
        tenantsQuery = tenantsQuery.eq('subscription_status', 'active');
    } else if (filter === 'suspended') {
        tenantsQuery = tenantsQuery.neq('subscription_status', 'active');
    }

    if (searchQuery) {
        tenantsQuery = tenantsQuery.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
    }

    const { data: tenants } = await tenantsQuery;

    // Calcular max para el chart
    const maxBookings = Math.max(...stats.last7Days.map(d => d.count), 1);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-32">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
                        <p className="text-gray-500 text-sm">Control Center de la Plataforma</p>
                    </div>
                    <Link
                        href="/admin/platform/new"
                        className="hidden md:flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
                    >
                        <Plus size={18} />
                        Nueva Barbería
                    </Link>
                </div>

                {/* Alert Banner - Suspended Tenants */}
                {stats.suspendedTenants > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-amber-900">
                                {stats.suspendedTenants} barbería{stats.suspendedTenants > 1 ? 's' : ''} suspendida{stats.suspendedTenants > 1 ? 's' : ''}
                            </p>
                            <p className="text-amber-700 text-sm">Revisa y activa las barberías pendientes</p>
                        </div>
                        <Link
                            href="/admin/platform?filter=suspended"
                            className="text-amber-700 font-semibold text-sm hover:underline"
                        >
                            Ver →
                        </Link>
                    </div>
                )}

                {/* Stats Grid with Trends */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stats.totalTenants}</p>
                        <p className="text-xs text-gray-500 font-medium">Barberías</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stats.activeTenants}</p>
                        <p className="text-xs text-gray-500 font-medium">Activas</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-black text-gray-900">{stats.monthlyBookings}</p>
                            {stats.bookingTrend !== 0 && (
                                <span className={`text-xs font-bold flex items-center ${stats.bookingTrend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {stats.bookingTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {stats.bookingTrend > 0 ? '+' : ''}{stats.bookingTrend}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Citas/Mes</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-black text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
                            {stats.revenueTrend !== 0 && (
                                <span className={`text-xs font-bold flex items-center ${stats.revenueTrend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {stats.revenueTrend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {stats.revenueTrend > 0 ? '+' : ''}{stats.revenueTrend}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Revenue/Mes</p>
                    </div>
                </div>

                {/* Mini Chart - Last 7 Days */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">Citas - Últimos 7 días</h3>
                    <div className="flex items-end justify-between gap-2 h-24">
                        {stats.last7Days.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                                    style={{ height: `${(day.count / maxBookings) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                                />
                                <span className="text-[10px] text-gray-500 font-medium">{day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Tenant List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Header with Search and Filters */}
                            <div className="p-4 md:p-5 border-b border-gray-100">
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <h2 className="font-bold text-lg flex-shrink-0">Negocios ({tenants?.length || 0})</h2>

                                    {/* Search */}
                                    <form className="flex-1" action="/admin/platform">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="q"
                                                defaultValue={searchQuery}
                                                placeholder="Buscar..."
                                                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
                                        </div>
                                    </form>

                                    {/* Filter Tabs */}
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-shrink-0">
                                        <Link
                                            href={`/admin/platform?filter=all${searchQuery ? `&q=${searchQuery}` : ''}`}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Todos
                                        </Link>
                                        <Link
                                            href={`/admin/platform?filter=active${searchQuery ? `&q=${searchQuery}` : ''}`}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Activos
                                        </Link>
                                        <Link
                                            href={`/admin/platform?filter=suspended${searchQuery ? `&q=${searchQuery}` : ''}`}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'suspended' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Suspendidos
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {tenants?.map((tenant) => (
                                    <TenantListItem key={tenant.id} tenant={tenant} />
                                ))}

                                {(!tenants || tenants.length === 0) && (
                                    <div className="p-8 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Building2 className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium">
                                            {searchQuery ? 'No se encontraron resultados' : 'No hay negocios registrados'}
                                        </p>
                                        {!searchQuery && (
                                            <Link
                                                href="/admin/platform/new"
                                                className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm mt-2 hover:underline"
                                            >
                                                <Plus size={16} />
                                                Crear primera barbería
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form - Hidden on mobile, visible on desktop */}
                    <div className="hidden lg:block lg:col-span-1">
                        <TenantProvisioningForm />
                    </div>
                </div>

                {/* Mobile FAB */}
                <Link
                    href="/admin/platform/new"
                    className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
                >
                    <Plus size={24} />
                </Link>
            </div>
        </div>
    );
}
