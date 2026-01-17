'use client'

import { forwardRef } from 'react'
import { FullReportData } from './AnalyticsDashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

interface PrintableReportProps {
    data: FullReportData
    dateRange: string
}

const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
    ({ data, dateRange }, ref) => {
        const { financialKPIs, clientData } = data
        const staffBreakdown = clientData.staffBreakdown?.breakdown || []
        const staffTotals = clientData.staffBreakdown?.totals || { cash: 0, card: 0, transfer: 0, total: 0 }
        const topServices = clientData.topServices || []
        const staffRevenue = clientData.staffRevenue || []

        // Chart data for staff revenue
        const staffChartData = staffRevenue.map(item => ({
            name: item.staff_name,
            revenue: Number(item.total_revenue),
            servicios: item.total_services
        }))

        // Chart data for top services
        const servicesChartData = topServices.slice(0, 6).map(item => ({
            name: item.service_name,
            value: item.times_sold,
            revenue: Number(item.total_revenue)
        }))

        return (
            <div ref={ref} className="bg-white text-black p-8 min-h-screen" style={{ width: '210mm', minHeight: '297mm' }}>
                {/* HEADER */}
                <div className="border-b-2 border-gray-900 pb-4 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Fulanos Barber</h1>
                            <p className="text-gray-600 text-sm mt-1">Reporte Financiero</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">Período</p>
                            <p className="text-lg font-mono">{dateRange || 'Hoy'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Generado: {new Date().toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 1: KPIs FINANCIEROS */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold mb-4 border-l-4 border-blue-600 pl-3">
                        Resumen Financiero
                    </h2>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Revenue Total</p>
                            <p className="text-2xl font-black text-gray-900">
                                ${financialKPIs?.total_revenue?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) ?? '0.00'}
                            </p>
                            {financialKPIs?.growth_rate !== undefined && financialKPIs.growth_rate !== 0 && (
                                <p className={`text-xs font-bold mt-1 ${financialKPIs.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {financialKPIs.growth_rate >= 0 ? '↑' : '↓'} {Math.abs(financialKPIs.growth_rate).toFixed(1)}% vs anterior
                                </p>
                            )}
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Transacciones</p>
                            <p className="text-2xl font-black text-gray-900">
                                {financialKPIs?.total_transactions || 0}
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ticket Promedio</p>
                            <p className="text-2xl font-black text-gray-900">
                                ${financialKPIs?.avg_transaction_value?.toFixed(2) ?? '0.00'}
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Clientes Únicos</p>
                            <p className="text-2xl font-black text-gray-900">
                                {financialKPIs?.unique_clients || 0}
                            </p>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 2: CORTE POR BARBERO */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold mb-4 border-l-4 border-violet-600 pl-3">
                        Corte por Barbero
                    </h2>
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Barbero</th>
                                <th className="border border-gray-300 px-3 py-2 text-right font-bold">Efectivo</th>
                                <th className="border border-gray-300 px-3 py-2 text-right font-bold">Tarjeta</th>
                                <th className="border border-gray-300 px-3 py-2 text-right font-bold">Transferencia</th>
                                <th className="border border-gray-300 px-3 py-2 text-right font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffBreakdown.map((staff, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-3 py-2 font-medium">{staff.staffName}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staff.cash.toLocaleString()}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staff.card.toLocaleString()}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staff.transfer.toLocaleString()}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">${staff.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-900 text-white font-bold">
                                <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staffTotals.cash.toLocaleString()}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staffTotals.card.toLocaleString()}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staffTotals.transfer.toLocaleString()}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">${staffTotals.total.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                {/* SECCIÓN 3: GRÁFICAS */}
                <section className="mb-8 page-break-before">
                    <h2 className="text-lg font-bold mb-4 border-l-4 border-pink-600 pl-3">
                        Análisis Visual
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Revenue por Barbero */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Revenue por Barbero</h3>
                            {staffChartData.length > 0 ? (
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={staffChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" fontSize={10} stroke="#374151" />
                                            <YAxis fontSize={10} stroke="#374151" tickFormatter={(v) => `$${v}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-8">Sin datos</p>
                            )}
                        </div>

                        {/* Servicios Más Vendidos */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Servicios Más Vendidos</h3>
                            {servicesChartData.length > 0 ? (
                                <div className="flex items-center">
                                    <div className="h-48 w-32">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={servicesChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={50}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    isAnimationActive={false}
                                                >
                                                    {servicesChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-1.5 text-xs pl-2">
                                        {topServices.slice(0, 5).map((service, idx) => (
                                            <div key={idx} className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                    <span className="leading-tight break-words">{service.service_name}</span>
                                                </div>
                                                <span className="font-mono font-bold flex-shrink-0">${Number(service.total_revenue).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-8">Sin datos</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="border-t border-gray-300 pt-4 mt-8 text-center text-xs text-gray-500">
                    <p>Reporte generado por AgendaBarber | © {new Date().getFullYear()} Todos los derechos reservados.</p>
                </footer>
            </div>
        )
    }
)

PrintableReport.displayName = 'PrintableReport'

export default PrintableReport
