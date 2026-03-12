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
            const updated = { ...next[index], [field]: value }

            // Recalcular estado
            let newStatus = updated.status;
            const priceNum = Number(updated.price);

            if (!updated.name || isNaN(priceNum) || priceNum <= 0) {
                newStatus = 'red';
            } else if (updated.metadata?.is_addon) {
                newStatus = 'blue';
            } else if (!updated.duration_min || Number(updated.duration_min) === 30) {
                newStatus = 'yellow';
            } else {
                newStatus = 'green';
            }

            updated.status = newStatus;
            next[index] = updated;
            return next
        })
    }

    // Clasificar servicios por estado
    const redCount = data.filter(s => s.status === 'red' || !s.name || Number(s.price) <= 0).length;
    const yellowCount = data.filter(s => s.status === 'yellow').length;
    const blueCount = data.filter(s => s.status === 'blue').length;

    // Bloquear guardado si hay errores críticos (Rojo)
    const canSave = redCount === 0 && !isSaving;

    return (
        <div className="bg-white border flex flex-col h-full border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                    <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                        <span>🧐</span> Paso 3: Revisión de Datos
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Se detectaron <strong>{data.length}</strong> elementos.
                    </p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                    {redCount > 0 && (
                        <div className="bg-red-50 text-red-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 border border-red-200">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>{redCount} servicio(s) bloqueado(s). Ingresa nombre y precio para continuar.</span>
                        </div>
                    )}
                    {yellowCount > 0 && (
                        <div className="bg-yellow-50 text-yellow-800 text-[11px] font-semibold px-2 py-1.5 rounded-lg flex items-center gap-1.5 border border-yellow-200 opacity-90">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>{yellowCount} con duración estimada (30 min).</span>
                        </div>
                    )}
                    {blueCount > 0 && (
                        <div className="bg-blue-50 text-blue-800 text-[11px] font-semibold px-2 py-1.5 rounded-lg flex items-center gap-1.5 border border-blue-200 opacity-90">
                            <span className="shrink-0 text-[12px]">💡</span>
                            <span>{blueCount} Add-ons detectados.</span>
                        </div>
                    )}
                </div>
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
                            const isError = item.status === 'red' || !item.name || Number(item.price) <= 0;
                            const isWarning = item.status === 'yellow';
                            const isInfo = item.status === 'blue';
                            const note = item.metadata?.note;

                            return (
                                <tr key={idx} className={cn("hover:bg-gray-50 transition-colors",
                                    isError && "bg-red-50/20",
                                    isInfo && "bg-blue-50/10",
                                    isWarning && "bg-yellow-50/20"
                                )}>
                                    <td className="px-4 py-3">
                                        <input
                                            value={item.name}
                                            onChange={e => handleChange(idx, 'name', e.target.value)}
                                            className={cn("w-full font-bold text-gray-900 bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded focus:bg-white transition-all shadow-none",
                                                !item.name && "border border-red-300 bg-red-50 focus:ring-red-500")}
                                            placeholder="Nombre del servicio"
                                        />
                                        <div className="px-1 mt-0.5 flex flex-wrap items-center gap-1.5">
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]",
                                                isInfo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                            )}>
                                                {item.category}
                                            </span>
                                            {note && (
                                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-100 truncate max-w-[200px]" title={note}>
                                                    📝 {note}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                value={item.price === null ? '' : item.price}
                                                onChange={e => handleChange(idx, 'price', e.target.value)}
                                                className={cn(
                                                    "w-24 border rounded-lg pl-6 pr-2 py-1.5 font-medium focus:ring-2 transition-all",
                                                    isError
                                                        ? "border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500"
                                                        : (isWarning ? "border-yellow-300 bg-yellow-50 focus:ring-yellow-500" : "border-gray-200 bg-gray-50 focus:ring-black")
                                                )}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={item.duration_min}
                                            onChange={e => handleChange(idx, 'duration_min', e.target.value)}
                                            className={cn(
                                                "w-20 border rounded-lg px-3 py-1.5 font-medium focus:ring-2 transition-all",
                                                isWarning
                                                    ? "border-yellow-300 bg-yellow-50 focus:ring-yellow-500"
                                                    : "border-gray-200 bg-gray-50 focus:ring-black"
                                            )}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isError ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full" title="Precio o nombre faltante. Obligatorio.">
                                                <AlertTriangle size={12} strokeWidth={3} />
                                            </span>
                                        ) : isInfo ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full" title="Add-on autodetectado. Verifica categoría.">
                                                <span className="text-[12px]">💡</span>
                                            </span>
                                        ) : isWarning ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full" title="Duración estimada o requiere revisión">
                                                <AlertTriangle size={12} strokeWidth={3} />
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
                    disabled={!canSave}
                    className="w-full sm:w-auto bg-black text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide disabled:cursor-not-allowed"
                    title={!canSave ? "Resuelve los errores en rojo antes de guardar" : "Guardar Servicios"}
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
