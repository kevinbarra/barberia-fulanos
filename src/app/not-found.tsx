'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
            {/* Icono de Error */}
            <div className="mb-6 text-6xl">🚧</div>

            <h1 className="text-3xl font-bold mb-2">Página no encontrada</h1>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto">
                Parece que te has perdido. La página que buscas no existe o ha cambiado de lugar.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                {/* Botón Principal: Volver Atrás */}
                <button
                    onClick={() => router.back()}
                    className="w-full py-3 px-4 bg-white text-black font-bold rounded-lg active:scale-95 transition-transform"
                >
                    ← Regresar
                </button>

                {/* Botón Secundario: Ir al POS (Seguridad) */}
                <button
                    onClick={() => router.push('/admin/pos')}
                    className="w-full py-3 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-900 active:scale-95 transition-transform"
                >
                    Ir al POS
                </button>
            </div>
        </div>
    )
}
