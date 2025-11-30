'use client'

import { useState } from 'react'
import { updateService, toggleServiceStatus, deleteService } from '@/app/admin/services/actions'
import { toast } from 'sonner'
import { Edit2, Power, Clock, DollarSign, Trash2 } from 'lucide-react'

type Service = {
    id: string
    name: string
    price: number
    duration_min: number
    is_active: boolean
    category?: string // <--- PROPIEDAD NUEVA
}

const CATEGORIES = ['Cortes', 'Barba', 'Cejas', 'Paquetes', 'Extras'];

export default function ServiceList({ services }: { services: Service[] }) {
    const [editingId, setEditingId] = useState<string | null>(null)

    const handleToggle = async (id: string, status: boolean) => {
        const result = await toggleServiceStatus(id, status)
        if (result.success) toast.success(result.message)
        else toast.error(result.error)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio permanentemente?')) return
        toast.loading('Eliminando...')
        const result = await deleteService(id)
        toast.dismiss()
        if (result.success) toast.success(result.message)
        else toast.error(result.error)
    }

    return (
        <div className="space-y-4">
            {services.map((service) => (
                <div
                    key={service.id}
                    className={`bg-white p-4 rounded-xl border transition-all ${!service.is_active ? 'border-gray-100 opacity-60 bg-gray-50' : 'border-gray-200 hover:border-black'
                        }`}
                >
                    {editingId === service.id ? (
                        /* MODO EDICIÓN (ACTUALIZADO) */
                        <form
                            action={async (formData) => {
                                const res = await updateService(formData)
                                if (res.success) {
                                    toast.success(res.message)
                                    setEditingId(null)
                                } else {
                                    toast.error(res.error)
                                }
                            }}
                            className="flex flex-col gap-3"
                        >
                            <input type="hidden" name="id" value={service.id} />

                            {/* Nombre y Categoría en Edición */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                                    <input name="name" defaultValue={service.name} className="p-2 border rounded-lg font-bold w-full" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Categoría</label>
                                    <select name="category" defaultValue={service.category || 'General'} className="p-2 border rounded-lg w-full text-sm bg-white">
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative w-1/2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Precio</label>
                                    <span className="absolute left-2 top-8 text-gray-400">$</span>
                                    <input name="price" type="number" defaultValue={service.price} className="p-2 pl-6 border rounded-lg w-full" />
                                </div>
                                <div className="relative w-1/2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Duración</label>
                                    <input name="duration" type="number" defaultValue={service.duration_min} className="p-2 border rounded-lg w-full" />
                                    <span className="absolute right-2 top-8 text-gray-400 text-xs">min</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2 justify-end">
                                <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 text-sm px-3 py-2 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">Guardar Cambios</button>
                            </div>
                        </form>
                    ) : (
                        /* MODO VISUALIZACIÓN (CON BADGE DE CATEGORÍA) */
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded-md border border-zinc-200 tracking-wider">
                                        {service.category || 'General'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900">{service.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {service.duration_min} min</span>
                                    <span className="flex items-center gap-1 font-medium text-green-700"><DollarSign size={14} /> {service.price}</span>
                                </div>
                            </div>

                            <div className="flex gap-1">
                                <button
                                    onClick={() => setEditingId(service.id)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>

                                <button
                                    onClick={() => handleToggle(service.id, service.is_active)}
                                    className={`p-2 rounded-lg transition-colors ${service.is_active
                                        ? 'text-green-500 hover:bg-green-50'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                        }`}
                                    title={service.is_active ? "Desactivar" : "Activar"}
                                >
                                    <Power size={18} />
                                </button>

                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar permanentemente"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}