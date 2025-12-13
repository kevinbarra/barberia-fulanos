import { getFinancialDashboard, getStaffRevenue, getTopServices, getClientRetentionMetrics, getRevenueByWeekday, getHourlyRevenue } from './actions';
import FinancialKPIs from '@/components/admin/reports/FinancialKPIs';
import StaffRevenueChart from '@/components/admin/reports/StaffRevenueChart';
import TopServicesChart from '@/components/admin/reports/TopServicesChart';
import RetentionChart from '@/components/admin/reports/RetentionChart';
import DateRangeSelector from '@/components/admin/reports/DateRangeSelector';
import HourlyHeatmap from '@/components/admin/reports/HourlyHeatmap';
import WeekdayTrendsChart from '@/components/admin/reports/WeekdayTrendsChart';
import CashDrawerSummary from '@/components/admin/reports/CashDrawerSummary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ReportsPage(props: { searchParams: Promise<any> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Seguridad: Si es staff, lo mandamos al dashboard general
    if (profile?.role === 'staff') {
        redirect('/admin');
    }

    const searchParams = await props.searchParams;
    const startDate = searchParams?.startDate;
    const endDate = searchParams?.endDate;
    const month = searchParams?.month;

    const [
        financialData,
        staffRevenue,
        topServices,
        retention,
        weekdayData,
        hourlyData
    ] = await Promise.all([
        getFinancialDashboard(startDate, endDate),
        getStaffRevenue(month),
        getTopServices(month),
        getClientRetentionMetrics(),
        getRevenueByWeekday(),
        getHourlyRevenue()
    ]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reportes & Analytics</h1>
                        <p className="text-gray-500 font-medium">Dashboard financiero y métricas de negocio</p>
                    </div>
                    <DateRangeSelector />
                </div>

                {/* Corte de Caja - Hoy (Prioritario) */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-green-600">💰</span>
                        Corte de Caja
                    </h2>
                    <CashDrawerSummary />
                </div>

                {/* KPIs Principales */}
                <FinancialKPIs data={financialData} />

                {/* Sección Operativa (Nuevo) */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-purple-600">⚡</span>
                        Métricas Operativas
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WeekdayTrendsChart data={weekdayData} />
                        <HourlyHeatmap data={hourlyData} />
                    </div>
                </div>

                {/* Gráficas Financieras */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Desempeño Financiero</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StaffRevenueChart data={staffRevenue} />
                        <TopServicesChart data={topServices} />
                    </div>
                </div>

                {/* Retención de Clientes */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Retención y Lealtad</h2>
                    <RetentionChart data={retention} />
                </div>
            </div>
        </div>
    );
}

