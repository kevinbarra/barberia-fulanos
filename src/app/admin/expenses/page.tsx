'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense } from './actions'
import { toast } from 'sonner'
import {
    Receipt,
    DollarSign,
    FileText,
    Check,
    Banknote,
    CreditCard,
    ArrowRightLeft
} from 'lucide-react'

export default function ExpensesPage() {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }

        if (!description.trim()) {
            toast.error('Ingresa una descripción')
            return
        }

        setIsSubmitting(true)
        const result = await createExpense({
            amount: parseFloat(amount),
            description: description.trim(),
            paymentMethod
        })
        setIsSubmitting(false)

        if (result.success) {
            setShowSuccess(true)
            toast.success('✅ Gasto registrado')

            // Reset form after brief delay
            setTimeout(() => {
                setAmount('')
                setDescription('')
                setPaymentMethod('cash')
                setShowSuccess(false)
            }, 1500)

            router.refresh()
        } else {
            toast.error(result.error || 'Error al registrar')
        }
    }

    // Success animation state
    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <Check className="w-12 h-12 text-green-600" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">¡Gasto Registrado!</h2>
                <p className="text-gray-500 mt-2">${parseFloat(amount).toFixed(2)} - {description}</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Registrar Gasto</h1>
                        <p className="text-gray-500 text-sm">Salida de caja</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Monto
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Description Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Concepto / Descripción
                    </label>
                    <div className="relative">
                        <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Compra de productos, comida, etc."
                            rows={3}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors resize-none"
                        />
                    </div>
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Método de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'cash', label: 'Efectivo', icon: Banknote },
                            { id: 'card', label: 'Tarjeta', icon: CreditCard },
                            { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft }
                        ].map((method) => (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => setPaymentMethod(method.id)}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === method.id
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                            >
                                <method.icon className="w-6 h-6" />
                                <span className="text-xs font-bold">{method.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || !amount || !description.trim()}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <span className="animate-pulse">Registrando...</span>
                    ) : (
                        <>
                            <Receipt className="w-5 h-5" />
                            Registrar Salida de Caja
                        </>
                    )}
                </button>
            </form>

            {/* Info Note */}
            <p className="text-center text-xs text-gray-400 mt-6">
                Este gasto se descontará del balance de caja del día.
            </p>
        </div>
    )
}
