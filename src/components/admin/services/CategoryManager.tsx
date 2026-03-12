'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/app/admin/services/actions'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
}

interface CategoryManagerProps {
    categories: Category[]
    tenantId: string
    canManage: boolean
}

export default function CategoryManager({ categories, tenantId, canManage }: CategoryManagerProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')

    const handleAdd = async () => {
        if (!newName.trim()) return
        setIsSubmitting(true)
        const res = await createCategory(newName.trim())
        setIsSubmitting(false)

        if (res.success) {
            toast.success('Categoría creada')
            setNewName('')
            setIsAdding(false)
        } else {
            toast.error(res.error || 'Error al crear categoría')
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return
        setIsSubmitting(true)
        const res = await updateCategory(id, editingName.trim())
        setIsSubmitting(false)

        if (res.success) {
            toast.success('Categoría actualizada')
            setEditingId(null)
        } else {
            toast.error(res.error || 'Error al actualizar')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta categoría?')) return
        setIsSubmitting(true)
        const res = await deleteCategory(id)
        setIsSubmitting(false)

        if (res.success) {
            toast.success('Categoría eliminada')
        } else {
            toast.error(res.error || 'Error al eliminar')
        }
    }

    if (!canManage) return null

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Categorías de Servicio</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 px-3 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                    {isAdding ? <X size={14} /> : <Plus size={14} />}
                    {isAdding ? 'Cancelar' : 'Nueva'}
                </button>
            </div>

            <div className="p-4">
                {isAdding && (
                    <div className="flex gap-2 mb-4">
                        <input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ej. Manicura, Tintes..."
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={isSubmitting}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </button>
                    </div>
                )}

                {categories.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-2">No hay categorías personalizadas.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${editingId === cat.id ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500' : 'bg-white border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                {editingId === cat.id ? (
                                    <input
                                        autoFocus
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm font-bold text-amber-900 w-24"
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-gray-700">{cat.name}</span>
                                )}

                                <div className="flex items-center gap-1 ml-1 border-l border-gray-100 pl-1">
                                    {editingId === cat.id ? (
                                        <>
                                            <button onClick={() => handleUpdate(cat.id)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                                <Check size={14} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                                <X size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded">
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
