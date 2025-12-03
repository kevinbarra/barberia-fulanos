'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { processPayment, linkTransactionToUser } from '@/app/admin/bookings/actions'
import QRScanner from './QRScanner'
import { toast } from 'sonner'
import { Check, X, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react'

type Booking = {
    id: string;
    service_name: string;
    price: number;
    client_name: string;
}

export default function CheckOutModal({
    booking,
    onClose,
}: {
    booking: Booking;
    onClose: () => void;
}) {
    const router = useRouter()
    const [step, setStep] = useState<'idle' | 'processing' | 'success' | 'scanning'>('idle')

    // CORRECCIÓN: Variable constante, sin setter
    const amount = booking.price;

    const [method, setMethod] = useState('cash')
    const [transactionId, setTransactionId] = useState<string | null>(null)
    const [pointsEarned, setPointsEarned] = useState(0)

    const handlePayment = async () => {
        setStep('processing')

        try {
            const result = await processPayment({
                booking_id: booking.id,
                amount: Number(amount),
                payment_method: method,
            })

            if (result.success && result.transactionId) {
                setTransactionId(result.transactionId)
                setPointsEarned(result.points || 0)
                setStep('success')
                toast.success('Cobro registrado correctamente')
                router.refresh()
            } else {
                toast.error(result.error || 'Error al procesar')
                setStep('idle')
            }
        } catch (e) {
            console.error(e)
            toast.error('Error de conexión')
            setStep('idle')
        }
    }

    const handleScanLink = async (scannedUserId: string) => {
        if (!transactionId) return
        toast.loading('Vinculando cliente...')
        const result = await linkTransactionToUser(transactionId, scannedUserId)
        if (result.success) {
            toast.dismiss()
            toast.success(result.message)
            onClose()
        } else {
            toast.dismiss()
            toast.error(result.message)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {step === 'idle' ? 'Cobrar Servicio' : step === 'scanning' ? 'Escanear Cliente' : 'Transacción Exitosa'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 'idle' || step === 'processing' ? (
                        <div className="space-y-6">
                            <div className="text-center space-y-1">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Por cobrar</span>
                                <h2 className="text-3xl font-black text-gray-900 pt-2">${amount}</h2>
                                <p className="text-gray-500 font-medium">{booking.service_name}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[{ id: 'cash', label: 'Efectivo', icon: Banknote }, { id: 'card', label: 'Tarjeta', icon: CreditCard }, { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft }].map((m) => (
                                    <button key={m.id} onClick={() => setMethod(m.id)} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${method === m.id ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                        <m.icon className="w-6 h-6" /><span className="text-xs font-bold">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={handlePayment} disabled={step === 'processing'} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-900 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                {step === 'processing' ? <span className="animate-pulse">Procesando...</span> : <>Confirmar Cobro</>}
                            </button>
                        </div>
                    ) : null}

                    {step === 'success' && (
                        <div className="text-center space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600"><Check className="w-10 h-10 stroke-[3]" /></div>
                            <div><h2 className="text-2xl font-bold text-gray-900">¡Pago Recibido!</h2><p className="text-gray-500 mt-2">Esta transacción genera <strong className="text-black">+{pointsEarned} puntos</strong></p></div>
                            <div className="space-y-3 pt-4">
                                <button onClick={() => setStep('scanning')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">📷 Escanear QR Cliente</button>
                                <button onClick={onClose} className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 text-sm">Saltar vinculación (Cliente anónimo)</button>
                            </div>
                        </div>
                    )}

                    {step === 'scanning' && (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 min-h-[300px] bg-black rounded-2xl overflow-hidden relative border-4 border-black">
                                <QRScanner onScanSuccess={handleScanLink} onClose={() => setStep('success')} />
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">Pide al cliente que muestre su QR desde la App</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}