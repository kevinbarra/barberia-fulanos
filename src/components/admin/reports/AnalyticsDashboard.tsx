'use client'

import { useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useAnalyticsData, AnalyticsClientData } from '@/hooks/useAnalyticsData'
import { FileDown, Loader2 } from 'lucide-react'
import { format, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

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
import ErrorBoundary from '@/components/ErrorBoundary'

// ==================== TYPES ====================

interface ServerSideData {
    financialKPIs: {
        total_revenue: number
        total_transactions: number
        avg_transaction_value: number
        unique_clients: number
        previous_revenue: number
        growth_rate: number
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
}

interface AnalyticsDashboardProps extends ServerSideData { }

// ==================== COMPONENT ====================

export default function AnalyticsDashboard({
    financialKPIs,
    retention,
    weekdayTrends,
    hourlyData
}: AnalyticsDashboardProps) {
    const searchParams = useSearchParams()
    const componentRef = useRef<HTMLDivElement>(null)

    // Get date params from URL
    const startISO = searchParams.get('startISO')
    const endISO = searchParams.get('endISO')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range label for PDF
    const getDateRangeLabel = (): string => {
        if (startDate && endDate) {
            const start = parseISO(startDate)
            const end = parseISO(endDate)
            if (isSameDay(start, end)) {
                return format(start, "d 'de' MMMM yyyy", { locale: es })
            }
            return `${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM yyyy", { locale: es })}`
        }
        return format(new Date(), "d 'de' MMMM yyyy", { locale: es })
    }

    // Fetch client-side data using centralized hook
    const { data: clientData, isLoading, refresh } = useAnalyticsData({
        startISO,
        endISO,
        startDate,
        endDate
    })

    // Combined data object for PDF export
    const fullReportData: FullReportData = {
        financialKPIs,
        retention,
        weekdayTrends,
        hourlyData,
        clientData
    }

    // React-to-print handler
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte-Fulanitos-${format(new Date(), 'yyyy-MM-dd')}`,
    })

    return (
        <div className="space-y-8">
            {/* Download PDF Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => handlePrint()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                    dateRange={getDateRangeLabel()}
                />
            </div>

            {/* Corte de Caja - Financial Summary */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-violet-600">✂️</span>
                    Corte por Barbero
                </h2>
                <ErrorBoundary fallbackTitle="Error en Corte por Barbero" fallbackMessage="No se pudo cargar el desglose.">
                    <StaffFinanceTable
                        data={clientData.staffBreakdown}
                        isLoading={isLoading}
                        onRefresh={refresh}
                    />
                </ErrorBoundary>
            </div>

            {/* Gráficas Financieras */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-blue-600">📊</span>
                    Desempeño Financiero
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ErrorBoundary fallbackTitle="Error en Gráfico" fallbackMessage="No se pudo cargar.">
                        <StaffRevenueChart
                            data={clientData.staffRevenue}
                            isLoading={isLoading}
                            onRefresh={refresh}
                        />
                    </ErrorBoundary>
                    <ErrorBoundary fallbackTitle="Error en Servicios" fallbackMessage="No se pudo cargar.">
                        <TopServicesChart
                            data={clientData.topServices}
                            isLoading={isLoading}
                            onRefresh={refresh}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            {/* KPIs Principales */}
            <FinancialKPIs data={financialKPIs} />

            {/* Sección Operativa */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Retención y Lealtad</h2>
                <RetentionChart data={retention} />
            </div>
        </div>
    )
}

