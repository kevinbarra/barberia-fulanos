import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";

const GTM_ID = "GTM-5TBF8XC8";

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
      {/* ⚡ PERF: Load GTM with lazyOnload to prevent WebKit parser-blocking on iOS devices */}
      <Script
        id="gtm-base"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
      />
      <Script id="gtm-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            'gtm.start': new Date().getTime(),
            event: 'gtm.js'
          });
        `}
      </Script>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900 selection:bg-black selection:text-white`}>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
        {/* Componente de notificaciones premium */}
        <Toaster position="top-center" richColors />
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}