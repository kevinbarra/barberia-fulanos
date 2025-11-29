'use client'

import { useRef, useState } from 'react'
import { createService } from '@/app/admin/services/actions'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

export default function CreateServiceForm({ tenantId }: { tenantId: string }) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true)

        // Llamamos a la Server Action
        const result = await createService(formData)

        setIsSubmitting(false)

        if (result?.success) {
            toast.success(result.message)
            formRef.current?.reset() // Limpiamos el formulario
        } else {
            toast.error(result?.error || 'Error al crear servicio')
        }
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Nuevo Servicio</h2>

            <form
                ref={formRef}
                action={handleSubmit}
                className="space-y-4"
            >
                <input type="hidden" name="tenant_id" value={tenantId} />

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
                    <input
                        name="name"
                        required
                        placeholder="Ej. Corte Fade"
                        className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Precio</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                                name="price"
                                type="number"
                                step="0.01"
                                required
                                placeholder="200"
                                className="w-full mt-1 p-3 pl-7 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Minutos</label>
                        <input
                            name="duration"
                            type="number"
                            required
                            placeholder="45"
                            className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-zinc-800 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                        <>
                            <Plus size={18} strokeWidth={3} />
                            Agregar
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}