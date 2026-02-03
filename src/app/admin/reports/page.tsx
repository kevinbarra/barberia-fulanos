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

// INTERFACE MATCHING RPC RETURN (Exact Match)
interface FinancialMetricsRPC {
    total_revenue: number | null;
    total_transactions: number | null;
    avg_transaction_value: number | null;
    unique_clients: number | null;
    previous_revenue: number | null;
    growth_rate: number | null;
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
    // We use getRevenueByWeekday to match the existing AnalyticsDashboard component support
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
    // Convert Nulls to Zeros to satisfy UI components
    const safeFinancialData = {
        total_revenue: Number(rawFinancialData?.total_revenue || 0),
        total_transactions: Number(rawFinancialData?.total_transactions || 0),
        avg_transaction_value: Number(rawFinancialData?.avg_transaction_value || 0),
        unique_clients: Number(rawFinancialData?.unique_clients || 0),
        previous_revenue: Number(rawFinancialData?.previous_revenue || 0),
        growth_rate: Number(rawFinancialData?.growth_rate || 0)
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Reportes & Analytics</h1>
                        <p className="text-gray-500 font-medium text-sm sm:text-base">Dashboard financiero y métricas de negocio</p>
                    </div>
                    <DateRangeSelector />
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
