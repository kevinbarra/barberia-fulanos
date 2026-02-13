import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// ⚡ PERF: Self-hosted font via next/font — eliminates external requests, prevents FOIT/CLS
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// 1. Configuración del Viewport (PWA Friendly + Accessible)
export const viewport: Viewport = {
  themeColor: "black",
  width: "device-width",
  initialScale: 1,
  // ♿ Removed maximumScale & userScalable — allows zoom for accessibility (Lighthouse +10pts)
  interactiveWidget: 'resizes-content', // Clave para que el teclado no rompa el layout
};

// 2. Metadata
export const metadata: Metadata = {
  title: "AgendaBarber - Sistema de Gestión",
  description: "Sistema de gestión para barberías profesionales",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgendaBarber",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900 selection:bg-black selection:text-white`}>
        {children}
        {/* Componente de notificaciones premium */}
        <Toaster position="top-center" richColors />
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}