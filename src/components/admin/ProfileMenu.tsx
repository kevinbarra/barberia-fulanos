'use client'

import { LogOut, Globe, Calendar, ExternalLink } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import Link from 'next/link'

export default function ProfileMenu({ tenantSlug }: { tenantSlug: string }) {
    return (
        <div className="mt-8 space-y-4 border-t border-gray-100 pt-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Navegación
            </h3>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50 shadow-sm">

                {/* IR AL SITIO WEB (Landing) */}
                <Link
                    href="/"
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Globe size={16} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">Ir al Sitio Web</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-300" />
                </Link>

                {/* IR A LA PÁGINA DE RESERVAS PÚBLICA */}
                <Link
                    href={`/book/${tenantSlug}`}
                    target="_blank"
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                            <Calendar size={16} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-black">Ver Página de Reservas</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-300" />
                </Link>

            </div>

            {/* ZONA DE PELIGRO / SALIDA */}
            <div className="pt-4">
                <button
                    onClick={() => signOut()}
                    className="w-full bg-red-50 border border-red-100 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">
                    Versión 1.0.0 • Barbería Fulanos
                </p>
            </div>
        </div>
    )
}