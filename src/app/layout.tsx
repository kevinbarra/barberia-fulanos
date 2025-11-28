import type { Metadata } from "next";
import "./globals.css"; // <--- ¡SI ESTA LINEA FALTA, NO HAY DISEÑO!

export const metadata: Metadata = {
  title: "Barbería Fulanos",
  description: "Sistema de gestión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}