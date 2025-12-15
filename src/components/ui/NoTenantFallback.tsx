import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function NoTenantFallback() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-yellow-100 p-4 rounded-full mb-6 max-w-[80px]">
                <AlertTriangle size={40} className="text-yellow-600" />
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-2">Cuenta no vinculada</h1>
            <p className="text-gray-500 max-w-md mb-8">
                Tu usuario ha iniciado sesión correctamente, pero no está vinculado a ninguna barbería activa.
                Si crees que es un error, contacta a soporte o al dueño del negocio.
            </p>

            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Reiniciar Sesión
                </Link>
                {/* Opcional: Si tienes soporte */}
                <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                >
                    Contactar Soporte
                </a>
            </div>
        </div>
    );
}
