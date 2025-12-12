'use client';

import { useState } from 'react';
import { X, Maximize2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRPresentationProps {
    qrValue: string; // This is the user ID
    clientName: string;
    points: number; // Initial points from server
}

export default function QRPresentation({ qrValue, clientName }: QRPresentationProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const enterFullscreen = () => {
        setIsFullscreen(true);
        // Intentar poner pantalla completa
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        // Intentar maximizar brillo (solo funciona en algunos navegadores)
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen');
        }
    };

    const exitFullscreen = () => {
        setIsFullscreen(false);
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    if (!isFullscreen) {
        return (
            <button
                onClick={enterFullscreen}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
                <Maximize2 className="w-5 h-5" />
                Mostrar QR para Cobro
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
            <button
                onClick={exitFullscreen}
                className="absolute top-4 right-4 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{clientName}</h1>
                <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Sparkles className="w-5 h-5" />
                    <p className="text-lg font-medium">Escanea para vincular puntos</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-purple-100">
                <QRCodeSVG
                    value={qrValue}
                    size={280}
                    level="H"
                    includeMargin={true}
                />
            </div>

            <p className="mt-6 text-gray-500 text-center text-sm">
                Muestra este código al cobrar
            </p>
        </div>
    );
}
