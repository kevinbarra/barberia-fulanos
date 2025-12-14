'use client'

import { useState } from 'react'
import { Building2, Users, Crown, ArrowRight } from 'lucide-react'

interface Account {
    tenantId: string
    slug: string
    name: string
    role: 'owner' | 'staff'
}

interface Props {
    accounts: Account[]
}

/**
 * SELECT ACCOUNT CLIENT COMPONENT
 * 
 * Renders the account selection UI for multi-tenant users.
 * Clicking an account redirects to its subdomain.
 */
export default function SelectAccountClient({ accounts }: Props) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleSelectAccount = (slug: string) => {
        setLoading(slug)

        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
            // In dev, redirect to /admin (single tenant simulation)
            console.log(`[DEV] Would redirect to: https://${slug}.agendabarber.pro/admin`)
            window.location.href = '/admin'
        } else {
            // In prod, redirect to the tenant's subdomain
            window.location.href = `https://${slug}.agendabarber.pro/admin`
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Selecciona una cuenta
                    </h1>
                    <p className="text-gray-400">
                        Tienes acceso a {accounts.length} negocios
                    </p>
                </div>

                {/* Account List */}
                <div className="space-y-3">
                    {accounts.map((account) => (
                        <button
                            key={account.tenantId}
                            onClick={() => handleSelectAccount(account.slug)}
                            disabled={loading !== null}
                            className={`
                                w-full bg-white rounded-2xl p-5 text-left
                                flex items-center justify-between gap-4
                                transition-all duration-200
                                ${loading === account.slug
                                    ? 'opacity-70 cursor-wait'
                                    : 'hover:ring-2 hover:ring-purple-500 hover:shadow-lg hover:shadow-purple-500/10'
                                }
                                ${loading !== null && loading !== account.slug ? 'opacity-50' : ''}
                                active:scale-[0.98]
                            `}
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                                    {account.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">
                                        {account.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {account.role === 'owner' ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                <Crown className="w-3 h-3" />
                                                Dueño
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <Users className="w-3 h-3" />
                                                Staff
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {account.slug}.agendabarber.pro
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className={`
                                w-10 h-10 rounded-full bg-gray-100 
                                flex items-center justify-center
                                transition-colors
                                ${loading === account.slug ? 'animate-pulse' : 'group-hover:bg-purple-100'}
                            `}>
                                <ArrowRight className={`w-5 h-5 ${loading === account.slug ? 'text-purple-600' : 'text-gray-400'}`} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    ¿No ves tu negocio? Contacta al administrador.
                </p>
            </div>
        </div>
    )
}
