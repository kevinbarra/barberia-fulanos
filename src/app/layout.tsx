import type { Metadata, Viewport } from "next";
import "./globals.css";

// 1. Configuración del Viewport (Zoom, escala, colores)
// Esto evita que el usuario haga zoom pellizcando y rompa el diseño "App"
export const viewport: Viewport = {
  themeColor: "black",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. Configuración de Metadata (SEO y PWA)
export const metadata: Metadata = {
  title: "Barbería Fulanos",
  description: "Sistema de gestión para barberías",
  manifest: "/manifest.json", // <--- AQUÍ CONECTAMOS EL PASAPORTE
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
      </body>
    </html>
  );
}