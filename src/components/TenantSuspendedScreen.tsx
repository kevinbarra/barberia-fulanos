'use client';

import { AlertTriangle, Mail, Phone } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';

interface TenantSuspendedScreenProps {
    tenantName: string;
}

export default function TenantSuspendedScreen({ tenantName }: TenantSuspendedScreenProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* Warning Icon */}
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black text-white mb-3">
                    Cuenta Suspendida
                </h1>

                {/* Business Name */}
                <p className="text-zinc-400 mb-6">
                    El acceso a <span className="text-white font-semibold">{tenantName}</span> ha sido temporalmente suspendido.
                </p>

                {/* Reason Box */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 mb-6 text-left">
                    <h3 className="text-white font-semibold mb-2">¿Por qué pasó esto?</h3>
                    <ul className="text-zinc-400 text-sm space-y-2">
                        <li>• Pago pendiente de suscripción</li>
                        <li>• Revisión de cuenta en proceso</li>
                        <li>• Solicitud del propietario</li>
                    </ul>
                </div>

                {/* Contact */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 text-left">
                    <h3 className="text-blue-400 font-semibold mb-3">¿Necesitas ayuda?</h3>
                    <div className="space-y-2">
                        <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                        >
                            <Mail size={18} className="text-blue-400" />
                            {SUPPORT_EMAIL}
                        </a>
                        <a
                            href="https://wa.me/522291589149"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors"
                        >
                            <Phone size={18} className="text-blue-400" />
                            +52 229 158 9149
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-zinc-600 text-xs mt-8">
                    © {new Date().getFullYear()} AgendaBarber. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
