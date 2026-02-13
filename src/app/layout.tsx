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
      <Script id="gtm-script" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
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