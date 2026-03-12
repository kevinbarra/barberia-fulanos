'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const PROMPT_TEXT = `Analiza la imagen de este menú de servicios. Extrae los datos y entrégalos ÚNICAMENTE en formato JSON.
Reglas:

Si no hay descripción, dejar vacío.

Si no hay duración, poner 30.

Generar un 'slug' (minúsculas, sin espacios, solo guiones).

Formato:
[
{
"name": "Nombre",
"price": 0.00,
"category": "Categoría",
"description": "...",
"duration_min": 30,
"slug": "nombre-del-servicio"
}
]`

export default function PromptCopier() {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(PROMPT_TEXT)
        setCopied(true)
        toast.success('Prompt copiado al portapapeles')
        setTimeout(() => setCopied(false), 3000)
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 flex flex-col justify-between to-blue-50 border border-indigo-100 rounded-3xl p-6 relative overflow-hidden h-full">
            <div className="relative z-10 flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <span>✨</span> Paso 1: Copiar el Prompt
                    </h3>
                    <button
                        onClick={handleCopy}
                        className="bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold py-2 px-4 rounded-full border border-indigo-200 shadow-sm transition-all flex items-center gap-2 uppercase tracking-wide active:scale-95"
                        title="Copiar prompt"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                </div>
                <p className="text-sm text-indigo-800/80 mb-4 font-medium leading-relaxed">
                    Sube la foto del menú a Gemini (o ChatGPT) junto con este prompt exacto:
                </p>
                <div className="bg-white/70 p-4 rounded-2xl border border-indigo-100/50 backdrop-blur-sm h-[200px] overflow-y-auto w-full custom-scrollbar">
                    <pre className="text-xs font-mono text-indigo-900/80 whitespace-pre-wrap leading-relaxed select-all">
                        {PROMPT_TEXT}
                    </pre>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.4);
                  border-radius: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(99, 102, 241, 0.3);
                  border-radius: 8px;
                }
            `}</style>
        </div>
    )
}
