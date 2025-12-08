'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary Caught:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-6">
                <AlertTriangle size={48} className="text-red-500" />
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-2 max-w-md">
                Algo salió mal inesperadamente
            </h1>

            <p className="text-gray-500 max-w-sm mb-8">
                Nuestro equipo ha sido notificado. Por favor intenta recargar la página.
            </p>

            <button
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
            >
                <RotateCw size={18} />
                Intentar de nuevo
            </button>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-lg max-w-2xl overflow-auto text-left w-full">
                    <p className="font-mono text-xs text-red-800 whitespace-pre-wrap">
                        {error.message}
                    </p>
                </div>
            )}
        </div>
    );
}
