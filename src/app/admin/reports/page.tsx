import {
    getFinancialDashboard,
    getClientRetentionMetrics,
    getRevenueByWeekday,
    getHourlyRevenue
} from './actions';
import DateRangeSelector from '@/components/admin/reports/DateRangeSelector';
import AnalyticsDashboard from '@/components/admin/reports/AnalyticsDashboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

    // Use admin client to get profile with tenant info (bypass RLS)
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    // Seguridad: Si es staff, lo mandamos al dashboard general
    if (profile?.role === 'staff') {
        redirect('/admin');
    }

    // Fetch tenant name for white-label branding
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
    const startDate = searchParams?.startDate;
    const endDate = searchParams?.endDate;

    // Fetch server-side data
    const [
        rawFinancialData,
        retention,
        weekdayData,
        hourlyData
    ] = await Promise.all([
        getFinancialDashboard(startDate, endDate) as Promise<FinancialMetricsRPC>,
        getClientRetentionMetrics(),
        getRevenueByWeekday(),
        getHourlyRevenue()
    ]);

    // TYPE SAFETY & NORMALIZATION (Prevent Crashes)
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
                        <p className="text-gray-500 font-medium text-sm sm:text-base">Dashboard financiero y métricas de negocio</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        {/* Quick Filters */}
                        <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-full sm:w-auto">
                            <Link 
                                href="/admin/reports?startDate=today" 
                                className="px-4 py-1.5 text-xs font-bold text-gray-400 hover:text-black transition-colors"
                            >
                                HOY
                            </Link>
                            <Link 
                                href="/admin/reports?preset=week" 
                                className="px-4 py-1.5 text-xs font-bold text-gray-400 hover:text-black border-l border-gray-100 transition-colors"
                            >
                                SEMANA
                            </Link>
                            <Link 
                                href="/admin/reports?preset=month" 
                                className="px-4 py-1.5 text-xs font-bold text-gray-400 hover:text-black border-l border-gray-100 transition-colors"
                            >
                                MES
                            </Link>
                        </div>
                        <DateRangeSelector />
                    </div>
                </div>

                {/* Analytics Dashboard - Client Component with centralized data */}
                <AnalyticsDashboard
                    financialKPIs={safeFinancialData}
                    retention={retention || []}
                    weekdayTrends={weekdayData || []}
                    hourlyData={hourlyData || []}
                    tenantName={tenantName}
                />
            </div>
        </div>
    );
}
