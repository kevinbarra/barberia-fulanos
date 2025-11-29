'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useState, useEffect } from 'react'

interface QRScannerProps {
    onScanSuccess: (rawValue: string) => void
    onClose: () => void
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Anti-Hydration Hack: Aseguramos que esto solo corra en el cliente real
    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return <div className="h-64 bg-black/5 animate-pulse rounded-xl" />

    return (
        <div className="flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">

            <div className="relative w-full max-w-[280px] aspect-square overflow-hidden rounded-2xl border-4 border-black shadow-2xl bg-black">
                {/* Librería: @yudiel/react-qr-scanner
                    Corrección TypeScript: Eliminamos 'audio' de components.
                    - formats: Por defecto escanea todo, optimizado.
                    - components: Solo personalizamos 'finder' si el tipo lo permite.
                */}
                <Scanner
                    onScan={(result) => {
                        if (result && result.length > 0) {
                            // Feedback háptico manual (vibración)
                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                navigator.vibrate(200)
                            }
                            onScanSuccess(result[0].rawValue)
                        }
                    }}
                    onError={(err) => {
                        console.error("QR Error:", err)
                        setError('No se pudo acceder a la cámara.')
                    }}
                    components={{
                        // 'audio' eliminado para corregir el error de tipo.
                        // La librería ya no soporta esa prop en 'components' en esta versión.
                        finder: false // Mantenemos el finder desactivado para usar nuestro diseño
                    }}
                    styles={{
                        container: { width: '100%', height: '100%' },
                        video: { objectFit: 'cover' }
                    }}
                />

                {/* Overlay de Guía Visual (Estética Fulanos) */}
                <div className="absolute inset-0 border-[2px] border-white/20 rounded-xl pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white/80 rounded-lg"></div>
                    <div className="absolute top-2 right-2">
                        <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg font-bold text-center">
                    ⚠️ {error} <br /> Revisa los permisos del navegador.
                </div>
            ) : (
                <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center animate-pulse">
                    Escaneando Cliente...
                </p>
            )}

            <button
                onClick={onClose}
                className="mt-6 text-sm text-gray-500 underline hover:text-black transition-colors"
            >
                Cancelar y cerrar
            </button>
        </div>
    )
}