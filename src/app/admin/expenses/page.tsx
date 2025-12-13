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
    ArrowRightLeft,
    Loader2,
    AlertCircle
} from 'lucide-react'

export default function ExpensesPage() {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [errors, setErrors] = useState<{ amount?: string; description?: string }>({})

    const validate = () => {
        const newErrors: { amount?: string; description?: string } = {}

        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'Ingresa un monto válido mayor a $0'
        }

        if (!description.trim()) {
            newErrors.description = 'La descripción es requerida'
        } else if (description.trim().length < 3) {
            newErrors.description = 'Mínimo 3 caracteres'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsSubmitting(true)
        const result = await createExpense({
            amount: parseFloat(amount),
            description: description.trim(),
            paymentMethod
        })
        setIsSubmitting(false)

        if (result.success) {
            setShowSuccess(true)
            toast.success('Gasto registrado correctamente')

            setTimeout(() => {
                setAmount('')
                setDescription('')
                setPaymentMethod('cash')
                setErrors({})
                setShowSuccess(false)
            }, 2000)

            router.refresh()
        } else {
            toast.error(result.error || 'Error al registrar')
        }
    }

    // Success State - Clean animation
    if (showSuccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="text-center animate-in zoom-in-95 fade-in duration-300">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                        <Check className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        Gasto Registrado
                    </h2>
                    <p className="text-gray-500">
                        <span className="font-mono font-medium text-gray-900">${parseFloat(amount).toFixed(2)}</span>
                        <span className="mx-2">·</span>
                        {description}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-lg mx-auto p-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-medium mb-4">
                        <Receipt className="w-3.5 h-3.5" />
                        Salida de Caja
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Registrar Gasto
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Registra las salidas de dinero del día
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <form onSubmit={handleSubmit} className="divide-y divide-gray-100">

                        {/* Amount Input */}
                        <div className="p-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monto
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-lg font-medium">$</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value)
                                        if (errors.amount) setErrors({ ...errors, amount: undefined })
                                    }}
                                    placeholder="0.00"
                                    className={`
                                        w-full pl-10 pr-4 py-3.5 text-xl font-mono font-medium
                                        border rounded-xl transition-all duration-200
                                        focus:outline-none focus:ring-2 focus:ring-offset-0
                                        ${errors.amount
                                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                            : 'border-gray-200 focus:border-gray-900 focus:ring-gray-100'
                                        }
                                    `}
                                    autoFocus
                                />
                            </div>
                            {errors.amount && (
                                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.amount}
                                </p>
                            )}
                        </div>

                        {/* Description Input */}
                        <div className="p-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Concepto
                            </label>
                            <div className="relative">
                                <textarea
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value)
                                        if (errors.description) setErrors({ ...errors, description: undefined })
                                    }}
                                    placeholder="Ej: Compra de productos, comida del equipo..."
                                    rows={3}
                                    className={`
                                        w-full px-4 py-3 text-base
                                        border rounded-xl transition-all duration-200 resize-none
                                        focus:outline-none focus:ring-2 focus:ring-offset-0
                                        ${errors.description
                                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                            : 'border-gray-200 focus:border-gray-900 focus:ring-gray-100'
                                        }
                                    `}
                                />
                            </div>
                            {errors.description && (
                                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="p-5">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Método de Pago
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'cash', label: 'Efectivo', icon: Banknote, color: 'emerald' },
                                    { id: 'card', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
                                    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'violet' }
                                ].map((method) => {
                                    const isSelected = paymentMethod === method.id
                                    return (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`
                                                relative flex flex-col items-center justify-center gap-1.5 p-4 
                                                rounded-xl border-2 transition-all duration-200
                                                ${isSelected
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                                                }
                                            `}
                                        >
                                            <method.icon className={`w-5 h-5 ${isSelected ? 'text-gray-900' : 'text-gray-400'}`} />
                                            <span className={`text-xs font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {method.label}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="p-5 bg-gray-50/50">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="
                                    w-full py-3.5 px-4 
                                    bg-gray-900 hover:bg-gray-800 
                                    text-white font-medium rounded-xl
                                    transition-all duration-200
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2
                                    shadow-sm hover:shadow
                                "
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    <>
                                        <Receipt className="w-4 h-4" />
                                        Registrar Gasto
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Este gasto se descontará del balance de caja del día
                </p>
            </div>
        </div>
    )
}
