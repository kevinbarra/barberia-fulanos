import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner"; // <--- ESTO ES NUEVO
import "./globals.css";

// 1. Configuración del Viewport (PWA Friendly)
export const viewport: Viewport = {
  themeColor: "black",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. Metadata
export const metadata: Metadata = {
  title: "Barbería Fulanos",
  description: "Sistema de gestión para barberías",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fulanos",
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
      <body className="antialiased bg-gray-50 text-gray-900 selection:bg-black selection:text-white">
        {children}
        {/* Componente de notificaciones premium */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}