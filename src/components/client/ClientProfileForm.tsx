'use client'

import { useState } from 'react'
import { updateClientProfile } from '@/app/app/profile/actions'
import { toast } from 'sonner'
import { Loader2, Camera, User, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function ClientProfileForm({
    initialName,
    initialAvatar
}: {
    initialName: string,
    initialAvatar: string | null
}) {
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

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            {/* Header Navegación */}
            <div className="mb-8">
                <Link href="/app" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} className="mr-1" /> Volver a mi Wallet
                </Link>
            </div>

            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-8 text-center">Editar Mi Perfil</h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Dark Mode */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-2xl flex items-center justify-center">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Avatar"
                                        width={128}
                                        height={128}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-12 h-12 text-zinc-600" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-3 rounded-full cursor-pointer hover:bg-blue-500 transition-colors shadow-lg active:scale-95">
                                <Camera size={18} />
                                <input type="file" name="avatar" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

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