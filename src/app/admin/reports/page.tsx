import {
    getFinancialDashboard,
    getClientRetentionMetrics,
    getRevenueByWeekday,
    getHourlyRevenue,
    getRevenueByDay
} from './actions';
import DateRangeSelector from '@/components/admin/reports/DateRangeSelector';
import AnalyticsDashboard from '@/components/admin/reports/AnalyticsDashboard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    format,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

// Mexico City timezone offset (UTC-6)
const TIMEZONE_OFFSET = '-06:00';

function toISOWithTimezone(date: Date, isEndOfDay = false): string {
    const d = isEndOfDay ? endOfDay(date) : startOfDay(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${TIMEZONE_OFFSET}`;
}

function resolveDateParams(searchParams: any) {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let activePreset = searchParams?.preset || '';
    
    if (searchParams?.startDate && searchParams?.endDate && searchParams?.startDate !== 'today') {
        try {
            startDate = parseISO(searchParams.startDate);
            endDate = parseISO(searchParams.endDate);
            if (!activePreset) activePreset = 'custom';
        } catch {
            startDate = startOfMonth(today);
            endDate = today;
            activePreset = 'month';
        }
    } else {
        const preset = searchParams?.preset || (searchParams?.startDate === 'today' ? 'today' : 'month');
        activePreset = preset;
        
        switch (preset) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'yesterday':
                startDate = subDays(today, 1);
                endDate = subDays(today, 1);
                break;
            case 'week':
                startDate = subDays(today, 6);
                endDate = today;
                break;
            case 'month':
                startDate = startOfMonth(today);
                endDate = today;
                break;
            case 'last_month':
                const lastMonth = subMonths(today, 1);
                startDate = startOfMonth(lastMonth);
                endDate = endOfMonth(lastMonth);
                break;
            default:
                startDate = startOfMonth(today);
                endDate = today;
                activePreset = 'month';
        }
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const startISOStr = searchParams?.startISO || toISOWithTimezone(startDate, false);
    const endISOStr = searchParams?.endISO || toISOWithTimezone(endDate, true);

    let label = '';
    if (activePreset === 'today') {
        label = `Hoy (${format(startDate, "d 'de' MMMM", { locale: es })})`;
    } else if (activePreset === 'yesterday') {
        label = `Ayer (${format(startDate, "d 'de' MMMM", { locale: es })})`;
    } else if (activePreset === 'week') {
        label = `Últimos 7 días (${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM", { locale: es })})`;
    } else if (activePreset === 'month') {
        label = `Este mes (${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM", { locale: es })})`;
    } else if (activePreset === 'last_month') {
        label = `Mes pasado (${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM", { locale: es })})`;
    } else {
        label = `${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM yyyy", { locale: es })}`;
    }

    return {
        startDateStr,
        endDateStr,
        startISOStr,
        endISOStr,
        activePreset,
        label
    };
}

// INTERFACE MATCHING RPC RETURN (Exact Match)
interface FinancialMetricsRPC {
    total_revenue: number | null;
    total_collected?: number | null;
    total_pending?: number | null;
    total_transactions: number | null;
    avg_transaction_value: number | null;
    unique_clients: number | null;
    previous_revenue: number | null;
    growth_rate: number | null;
    payment_methods?: Array<{ method: string; amount: number }>;
}

export default async function ReportsPage(props: { searchParams: Promise<any> }) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'staff') {
        redirect('/admin');
    }

    let tenantName = 'Mi Negocio';
    if (profile?.tenant_id) {
        const { data: tenant } = await adminClient
            .from('tenants')
            .select('name')
            .eq('id', profile.tenant_id)
            .single();
        tenantName = tenant?.name || 'Mi Negocio';
    }

    const searchParams = await props.searchParams;
    const resolved = resolveDateParams(searchParams);

    // Fetch server-side data with matching date limits
    const [
        rawFinancialData,
        retention,
        weekdayData,
        hourlyData,
        dailyRevenueData
    ] = await Promise.all([
        getFinancialDashboard(resolved.startDateStr, resolved.endDateStr) as Promise<FinancialMetricsRPC>,
        getClientRetentionMetrics(),
        getRevenueByWeekday(),
        getHourlyRevenue(),
        getRevenueByDay(resolved.startDateStr, resolved.endDateStr)
    ]);

    const safeFinancialData = {
        total_revenue: Number(rawFinancialData?.total_revenue || 0),
        total_collected: Number(rawFinancialData?.total_collected || 0),
        total_pending: Number(rawFinancialData?.total_pending || 0),
        total_transactions: Number(rawFinancialData?.total_transactions || 0),
        avg_transaction_value: Number(rawFinancialData?.avg_transaction_value || 0),
        unique_clients: Number(rawFinancialData?.unique_clients || 0),
        previous_revenue: Number(rawFinancialData?.previous_revenue || 0),
        growth_rate: Number(rawFinancialData?.growth_rate || 0),
        payment_methods: rawFinancialData?.payment_methods || []
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Reportes & Analytics</h1>
                        <p className="text-gray-500 font-medium text-sm sm:text-base">
                            Período: <span className="text-gray-900 font-semibold">{resolved.label}</span>
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        {/* Quick Filters */}
                        <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-full sm:w-auto gap-1 overflow-x-auto">
                            {[
                                { id: 'today', label: 'HOY' },
                                { id: 'yesterday', label: 'AYER' },
                                { id: 'week', label: 'SEMANA' },
                                { id: 'month', label: 'MES' },
                                { id: 'last_month', label: 'MES PASADO' }
                            ].map((p) => {
                                const isActive = resolved.activePreset === p.id;
                                return (
                                    <Link 
                                        key={p.id}
                                        href={`/admin/reports?preset=${p.id}`} 
                                        className={`px-3 py-1.5 text-xs font-bold transition-all rounded-lg whitespace-nowrap ${
                                            isActive 
                                                ? 'bg-gray-950 text-white shadow-sm' 
                                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        {p.label}
                                    </Link>
                                );
                            })}
                        </div>
                        <DateRangeSelector />
                    </div>
                </div>

                {/* Analytics Dashboard */}
                <AnalyticsDashboard
                    financialKPIs={safeFinancialData}
                    retention={retention || []}
                    weekdayTrends={weekdayData || []}
                    hourlyData={hourlyData || []}
                    tenantName={tenantName}
                    startDateStr={resolved.startDateStr}
                    endDateStr={resolved.endDateStr}
                    startISOStr={resolved.startISOStr}
                    endISOStr={resolved.endISOStr}
                    dateRangeLabel={resolved.label}
                    activePreset={resolved.activePreset}
                    dailyRevenueData={dailyRevenueData || []}
                />
            </div>
        </div>
    );
}
