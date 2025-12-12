'use client';

import { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';

interface QRPresentationProps {
    qrValue: string; // This is the user ID
    clientName: string;
    points: number; // Initial points from server
}

export default function QRPresentation({ qrValue, clientName, points }: QRPresentationProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Use realtime hook for instant point updates when staff scans QR
    // qrValue is the user ID, so we use it for the subscription
    const realtimePoints = useRealtimePoints(qrValue, points);

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
                Mostrar QR en Pantalla Completa
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

            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">{clientName}</h1>
                <p className="text-6xl font-bold text-purple-600 transition-all duration-300">{realtimePoints}</p>
                <p className="text-2xl text-gray-600">puntos acumulados</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-2xl">
                <QRCodeSVG
                    value={qrValue}
                    size={300}
                    level="H"
                    includeMargin={true}
                />
            </div>

            <p className="mt-8 text-xl text-gray-600">
                Muestra este código al cobrar
            </p>
        </div>
    );
}

