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
                className="w-full bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color-secondary)] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-color-40)] hover:shadow-xl hover:opacity-95 active:scale-[0.99] transition-all"
            >
                <Maximize2 className="w-5 h-5" />
                Mostrar QR para Cobro
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-8 selection:bg-[var(--brand-color)]/30">
            <button
                onClick={exitFullscreen}
                className="absolute top-4 right-4 w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{clientName}</h1>
                <div className="flex items-center justify-center gap-2 text-[var(--brand-color)]">
                    <Sparkles className="w-5 h-5 text-[var(--brand-color)]" />
                    <p className="text-lg font-bold">Escanea para vincular puntos</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-[var(--brand-color-secondary-20)]">
                <QRCodeSVG
                    value={qrValue}
                    size={280}
                    level="H"
                    includeMargin={true}
                />
            </div>

            <p className="mt-6 text-zinc-500 text-center text-sm font-medium">
                Muestra este código al cobrar
            </p>
        </div>
    );
}
