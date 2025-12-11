'use client'

import { useState } from 'react'
import { updateClientProfile } from '@/app/app/profile/actions'
import { toast } from 'sonner'
import { Loader2, Camera, User, ChevronLeft, Mail, Phone, Star, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ClientProfileFormProps {
    initialName: string
    initialAvatar: string | null
    email: string
    phone: string
    loyaltyPoints: number
    memberSince: string
    tenantName?: string
}

export default function ClientProfileForm({
    initialName,
    initialAvatar,
    email,
    phone,
    loyaltyPoints,
    memberSince,
    tenantName
}: ClientProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatar)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await updateClientProfile(formData)

        setIsLoading(false)

        if (result?.success) {
            toast.success('¡Perfil actualizado!')
        } else {
            toast.error(result?.error || 'Error')
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            {/* Header Navegación */}
            <div className="mb-8">
                <Link href="/app" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} className="mr-1" /> Volver
                </Link>
            </div>

            <div className="max-w-md mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-center">Mi Perfil</h1>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Puntos de Lealtad */}
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <Star size={18} />
                            <span className="text-xs font-bold uppercase">Puntos</span>
                        </div>
                        <p className="text-3xl font-black text-white">{loyaltyPoints}</p>
                    </div>

                    {/* Miembro Desde */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                            <Calendar size={18} />
                            <span className="text-xs font-bold uppercase">Miembro desde</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{formatDate(memberSince)}</p>
                    </div>
                </div>

                {/* Tenant Info */}
                {tenantName && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Tu barbería</p>
                        <p className="text-lg font-bold text-white">{tenantName}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-2xl flex items-center justify-center">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Avatar"
                                        width={112}
                                        height={112}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-zinc-600" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-blue-500 transition-colors shadow-lg active:scale-95">
                                <Camera size={16} />
                                <input type="file" name="avatar" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    {/* Email - Solo lectura */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500 ml-1 flex items-center gap-2">
                            <Mail size={12} /> Correo electrónico
                        </label>
                        <div className="w-full p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-400 flex items-center gap-3">
                            <span>{email}</span>
                            <span className="ml-auto text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded">Verificado</span>
                        </div>
                    </div>

                    {/* Nombre - Editable */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500 ml-1">Tu Nombre</label>
                        <input
                            name="full_name"
                            defaultValue={initialName}
                            required
                            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-white placeholder-zinc-600"
                            placeholder="Tu nombre aquí"
                        />
                    </div>

                    {/* Teléfono - Editable */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-500 ml-1 flex items-center gap-2">
                            <Phone size={12} /> Teléfono
                        </label>
                        <input
                            name="phone"
                            type="tel"
                            defaultValue={phone}
                            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-white placeholder-zinc-600"
                            placeholder="Tu teléfono"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-200 active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    )
}