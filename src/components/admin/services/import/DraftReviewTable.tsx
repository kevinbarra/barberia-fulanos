'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Save, X, Edit2 } from 'lucide-react'
import { DraftService } from '@/app/admin/services/import/actions'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DraftReviewTableProps {
    initialData: DraftService[];
    onSave: (data: DraftService[]) => void;
    isSaving: boolean;
    onCancel: () => void;
}

export default function DraftReviewTable({ initialData, onSave, isSaving, onCancel }: DraftReviewTableProps) {
    const [data, setData] = useState<DraftService[]>(initialData)

    const handleChange = (index: number, field: keyof DraftService, value: any) => {
        setData(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    // Contar advertencias
    const warningsCount = data.filter(s => Number(s.duration_min) === 30 || Number(s.price) === 0).length

    return (
        <div className="bg-white border flex flex-col h-full border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                        <span>🧐</span> Paso 3: Revisión de Datos
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Se detectaron <strong>{data.length}</strong> servicios.
                    </p>
                </div>
                {warningsCount > 0 && (
                    <div className="bg-yellow-50 text-yellow-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 border border-yellow-200">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Revisa {warningsCount} servicios marcados en amarillo (precios en 0 o duración vacía = 30 min).</span>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full overflow-x-auto min-h-[300px] border border-gray-100 rounded-2xl custom-scrollbar relative">
                <table className="w-full text-left text-sm text-gray-600 min-w-[700px]">
                    <thead className="text-xs text-gray-400 bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-semibold uppercase">Servicio & Categoría</th>
                            <th className="px-4 py-3 font-semibold uppercase w-32">Precio</th>
                            <th className="px-4 py-3 font-semibold uppercase w-32">Duración (min)</th>
                            <th className="px-4 py-3 font-semibold uppercase w-20 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {data.map((item, idx) => {
                            const isDurationWarning = Number(item.duration_min) === 30
                            const isPriceWarning = Number(item.price) === 0
                            const hasWarning = isDurationWarning || isPriceWarning

                            return (
                                <tr key={idx} className={cn("hover:bg-gray-50 transition-colors", hasWarning && "bg-yellow-50/30")}>
                                    <td className="px-4 py-3">
                                        <input
                                            value={item.name}
                                            onChange={e => handleChange(idx, 'name', e.target.value)}
                                            className="w-full font-bold text-gray-900 bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded focus:bg-white transition-all shadow-none"
                                        />
                                        <div className="px-1 mt-0.5 flex items-center gap-2">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]">
                                                {item.category}
                                            </span>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                                                {item.slug}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={e => handleChange(idx, 'price', e.target.value)}
                                                className={cn(
                                                    "w-24 bg-gray-50 border rounded-lg pl-6 pr-2 py-1.5 font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all",
                                                    isPriceWarning ? "border-yellow-300 bg-yellow-100" : "border-gray-200"
                                                )}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={item.duration_min}
                                            onChange={e => handleChange(idx, 'duration_min', e.target.value)}
                                            className={cn(
                                                "w-20 bg-gray-50 border rounded-lg px-3 py-1.5 font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all",
                                                isDurationWarning ? "border-yellow-300 bg-yellow-100" : "border-gray-200"
                                            )}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {hasWarning ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full" title="Requiere revisión">
                                                <AlertTriangle size={12} />
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full">
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="text-gray-500 hover:text-gray-900 font-bold text-sm px-4 py-2 transition-colors disabled:opacity-50"
                >
                    Cancelar Importación
                </button>
                <button
                    onClick={() => onSave(data)}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-black text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide"
                >
                    {isSaving ? (
                        <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0"></span>
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            Guardar {data.length} Servicios
                        </>
                    )}
                </button>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 8px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    )
}
