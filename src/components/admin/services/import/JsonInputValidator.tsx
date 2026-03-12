'use client'
import { useState } from 'react'
import { Code, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DraftService } from '@/app/admin/services/import/actions'

export default function JsonInputValidator({ onValidJson }: { onValidJson: (data: DraftService[]) => void }) {
    const [jsonStr, setJsonStr] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleValidate = () => {
        try {
            if (!jsonStr.trim()) {
                setError('Pega el código JSON primero.')
                return
            }

            // Clean up: Sometimes users copy markdown blocks like ```json ... ```
            let cleanedJson = jsonStr.trim()
            if (cleanedJson.startsWith('\`\`\`json')) {
                cleanedJson = cleanedJson.replace('\`\`\`json', '')
            }
            if (cleanedJson.startsWith('\`\`\`')) {
                cleanedJson = cleanedJson.replace('\`\`\`', '')
            }
            if (cleanedJson.endsWith('\`\`\`')) {
                cleanedJson = cleanedJson.slice(0, -3)
            }
            cleanedJson = cleanedJson.trim()

            const parsed = JSON.parse(cleanedJson)

            if (!Array.isArray(parsed)) {
                setError('El JSON debe ser un arreglo que empiece con [ ]')
                return
            }

            if (parsed.length === 0) {
                setError('El arreglo está vacío.')
                return
            }

            // Basic structural validation
            const valid = parsed.every(item => 'name' in item && 'category' in item)

            if (!valid) {
                setError('Varios servicios no tienen la estructura correcta (falta "name" o "category").')
                return
            }

            setError(null)
            onValidJson(parsed)
        } catch (e: any) {
            setError('Error de sintaxis JSON. Asegúrate de copiar todo el arreglo [ ... ].')
        }
    }

    return (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                <span>📋</span> Paso 2: Pegar el JSON resultante
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Copia el bloque de código que generó la IA y pégalo aquí abajo:
            </p>

            <div className="relative flex-1 flex flex-col min-h-[220px]">
                <textarea
                    className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-mono text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all custom-scrollbar"
                    placeholder="[\n  {\n    'name': 'Corte',\n    'price': 150,\n    ...\n  }\n]"
                    value={jsonStr}
                    onChange={e => setJsonStr(e.target.value)}
                />
                <div className="absolute top-4 right-4 text-gray-400 pointer-events-none">
                    <Code size={20} />
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 overflow-hidden">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-5 flex justify-end">
                <button
                    onClick={handleValidate}
                    disabled={!jsonStr.trim()}
                    className="bg-black text-white font-bold py-3 px-6 rounded-xl text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide w-full md:w-auto"
                >
                    Procesar Datos
                </button>
            </div>
        </div>
    )
}
