'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useAnalyticsData, AnalyticsClientData } from '@/hooks/useAnalyticsData'
import { FileDown, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useVocabulary } from '@/providers/BusinessVocabularyProvider'

// Import all report components
import FinancialKPIs from '@/components/admin/reports/FinancialKPIs'
import StaffRevenueChart from '@/components/admin/reports/StaffRevenueChart'
import TopServicesChart from '@/components/admin/reports/TopServicesChart'
import RetentionChart from '@/components/admin/reports/RetentionChart'
import HourlyHeatmap from '@/components/admin/reports/HourlyHeatmap'
import WeekdayTrendsChart from '@/components/admin/reports/WeekdayTrendsChart'
import CashDrawerSummary from '@/components/admin/reports/CashDrawerSummary'
import ExpensesAuditTable from '@/components/admin/reports/ExpensesAuditTable'
import StaffFinanceTable from '@/components/admin/reports/StaffFinanceTable'
import PrintableReport from '@/components/admin/reports/PrintableReport'
import PaymentMethodsChart from '@/components/admin/reports/PaymentMethodsChart'
import DailyRevenueChart from '@/components/admin/reports/DailyRevenueChart'
import ErrorBoundary from '@/components/ErrorBoundary'

// ==================== TYPES ====================

interface ServerSideData {
    financialKPIs: {
        total_revenue: number
        total_collected?: number
        total_pending?: number
        total_transactions: number
        avg_transaction_value: number
        unique_clients: number
        previous_revenue: number
        growth_rate: number
        payment_methods?: Array<{ method: string; amount: number }>
    }
    retention: Array<{
        month: string
        retention_rate: number
        total_clients: number
        returning_clients: number
    }>
    weekdayTrends: Array<{
        weekday: string
        avg_revenue: number
        total_transactions: number
    }>
    hourlyData: Array<{
        hour: number
        avg_revenue: number
        transaction_count: number
    }>
}

export interface FullReportData extends ServerSideData {
    clientData: AnalyticsClientData
    tenantName: string
}

interface AnalyticsDashboardProps extends ServerSideData {
    tenantName: string
    startDateStr: string
    endDateStr: string
    startISOStr: string
    endISOStr: string
    dateRangeLabel: string
    activePreset: string
    dailyRevenueData: Array<{ day: string; revenue: number; bookings: number }>
}

// ==================== COMPONENT ====================

export default function AnalyticsDashboard({
    financialKPIs,
    retention,
    weekdayTrends,
    hourlyData,
    tenantName,
    startDateStr,
    endDateStr,
    startISOStr,
    endISOStr,
    dateRangeLabel,
    activePreset,
    dailyRevenueData
}: AnalyticsDashboardProps) {
    const componentRef = useRef<HTMLDivElement>(null)
    const { vocabulary } = useVocabulary()

    // Fetch client-side data using centralized hook synced with server dates
    const { data: clientData, isLoading, refresh } = useAnalyticsData({
        startISO: startISOStr,
        endISO: endISOStr,
        startDate: startDateStr,
        endDate: endDateStr
    })

    // Combined data object for PDF export
    const fullReportData: FullReportData = {
        financialKPIs,
        retention,
        weekdayTrends,
        hourlyData,
        clientData,
        tenantName
    }

    // Generate smart filename for PDF
    const getSmartFilename = (): string => {
        const safeName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
        if (startDateStr && endDateStr) {
            return `Reporte_${safeName}_${startDateStr}_al_${endDateStr}`
        }
        const today = format(new Date(), 'yyyy-MM-dd')
        return `Reporte_${safeName}_${today}`
    }

    // React-to-print handler
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: getSmartFilename(),
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Download PDF Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => handlePrint()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-gray-800"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileDown className="w-4 h-4" />
                    )}
                    Descargar Reporte
                </button>
            </div>

            {/* Hidden Printable Component */}
            <div style={{ display: 'none' }}>
                <PrintableReport
                    ref={componentRef}
                    data={fullReportData}
                    dateRange={dateRangeLabel}
                />
            </div>

            {/* KPIs Principales */}
            <FinancialKPIs data={financialKPIs} />

            {/* Gráfico de Ventas Diarias & Métodos de Pago */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ErrorBoundary fallbackTitle="Error en Tendencia de Ventas" fallbackMessage="No se pudo cargar el gráfico de ventas.">
                        <DailyRevenueChart data={dailyRevenueData} />
                    </ErrorBoundary>
                </div>
                <div className="lg:col-span-1">
                    <ErrorBoundary fallbackTitle="Error en Métodos de Pago" fallbackMessage="No se pudo cargar el gráfico de métodos de pago.">
                        <PaymentMethodsChart data={financialKPIs.payment_methods || []} />
                    </ErrorBoundary>
                </div>
            </div>

            {/* Corte de Caja - Financial Summary */}
            <div>
                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
                    <span className="text-green-600">💰</span>
                    Corte de Caja
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ErrorBoundary fallbackTitle="Error en Corte de Caja" fallbackMessage="No se pudo cargar el resumen.">
                        <CashDrawerSummary
                            data={clientData.cashDrawer}
                            isLoading={isLoading}
                            onRefresh={refresh}
                        />
                    </ErrorBoundary>
                    <ErrorBoundary fallbackTitle="Error en Gastos" fallbackMessage="No se pudo cargar la tabla de gastos.">
                        <ExpensesAuditTable
                            data={clientData.expenses}
                            isLoading={isLoading}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            {/* Staff Financial Breakdown */}
            <div>
                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
                    <span className="text-violet-600">✂️</span>
                    Corte por {vocabulary.staff_plural}
                </h2>
                <ErrorBoundary fallbackTitle={`Error en Corte por ${vocabulary.staff_plural}`} fallbackMessage="No se pudo cargar el desglose.">
                    <StaffFinanceTable
                        data={clientData.staffBreakdown}
                        isLoading={isLoading}
                        onRefresh={refresh}
                    />
                </ErrorBoundary>
            </div>

            {/* Gráficas de Rendimiento de Staff & Servicios */}
            <div>
                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
                    <span className="text-blue-600">📊</span>
                    Desempeño de Personal y Catálogo
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ErrorBoundary fallbackTitle="Error en Gráfico de Personal" fallbackMessage="No se pudo cargar el gráfico de personal.">
                        <StaffRevenueChart
                            data={clientData.staffRevenue}
                            isLoading={isLoading}
                            onRefresh={refresh}
                        />
                    </ErrorBoundary>
                    <ErrorBoundary fallbackTitle="Error en Servicios" fallbackMessage="No se pudo cargar el gráfico de servicios.">
                        <TopServicesChart
                            data={clientData.topServices}
                            isLoading={isLoading}
                            onRefresh={refresh}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            {/* Sección Operativa */}
            <div>
                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
                    <span className="text-purple-600">⚡</span>
                    Métricas Operativas
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <WeekdayTrendsChart data={weekdayTrends} />
                    <HourlyHeatmap data={hourlyData} />
                </div>
            </div>

            {/* Retención de Clientes */}
            <div>
                <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Retención y Lealtad</h2>
                <RetentionChart data={retention} />
            </div>
        </div>
    )
}
