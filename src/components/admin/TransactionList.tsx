'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { linkTransactionToUser } from '@/app/admin/bookings/actions'
import QRScanner from './QRScanner'
import { toast } from 'sonner'
import { QrCode, CheckCircle, Clock, User } from 'lucide-react'

type Transaction = {
    id: string
    service_name: string
    amount: number
    created_at: string
    client_id: string | null
    points_earned: number
}

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
    const router = useRouter()
    const [scanningTxId, setScanningTxId] = useState<string | null>(null)

    const handleScan = async (scannedUserId: string) => {
        if (!scanningTxId) return

        toast.loading('Vinculando cliente...')
        const result = await linkTransactionToUser(scanningTxId, scannedUserId)

        if (result.success) {
            toast.dismiss()
            toast.success(result.message)
            setScanningTxId(null) // Cerramos scanner
            router.refresh() // Actualizamos la lista visualmente
        } else {
            toast.dismiss()
            toast.error(result.message)
        }
    }

    // Modal de Escaneo Integrado (Rescate)
    if (scanningTxId) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white p-4 rounded-3xl w-full max-w-sm relative">
                    <button
                        onClick={() => setScanningTxId(null)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-black"
                    >
                        ✕
                    </button>
                    <h3 className="text-center font-bold mb-4 text-gray-900">Vincular Venta Pasada</h3>
                    <div className="aspect-square rounded-2xl overflow-hidden bg-black mb-4 border-2 border-gray-100">
                        <QRScanner
                            onScanSuccess={handleScan}
                            onClose={() => setScanningTxId(null)}
                        />
                    </div>
                    <p className="text-center text-xs text-gray-500">
                        Apunta al QR del cliente para asignar los puntos.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Actividad Reciente</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                    {transactions.length} registros hoy
                </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Clock size={24} />
                        </div>
                        <p className="text-gray-400 text-sm">No hay movimientos registrados hoy.</p>
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.client_id ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {tx.client_id ? <CheckCircle size={18} /> : <User size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 line-clamp-1">{tx.service_name}</p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span className="mx-1">•</span>
                                        <span className="text-gray-900">${tx.amount}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Lógica de Negocio: Botón de Rescate */}
                            {!tx.client_id ? (
                                <button
                                    onClick={() => setScanningTxId(tx.id)}
                                    className="pl-3 pr-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-black hover:shadow-lg hover:shadow-zinc-200 active:scale-95 transition-all whitespace-nowrap"
                                >
                                    <QrCode size={14} /> Vincular
                                </button>
                            ) : (
                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 whitespace-nowrap">
                                    +{tx.points_earned} pts
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}