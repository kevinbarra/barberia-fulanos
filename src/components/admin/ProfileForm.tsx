'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/admin/profile/actions'
import { toast } from 'sonner'
import { Loader2, Camera, User } from 'lucide-react'
import Image from 'next/image'

export default function ProfileForm({
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
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await updateProfile(formData)

        setIsLoading(false)

        if (result?.success) {
            toast.success(result.message)
        } else {
            toast.error(result?.error || 'Ocurrió un error')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100 flex items-center justify-center">
                        {previewUrl ? (
                            <Image
                                src={previewUrl}
                                alt="Avatar"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-12 h-12 text-gray-300" />
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-black text-white p-2.5 rounded-full cursor-pointer hover:bg-gray-800 transition-colors shadow-lg active:scale-95">
                        <Camera size={18} />
                        <input
                            type="file"
                            name="avatar"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </label>
                </div>
                <p className="text-xs text-gray-400 mt-3 font-medium">Toca la cámara para cambiar</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Nombre Completo</label>
                    <input
                        name="full_name"
                        defaultValue={initialName}
                        required
                        type="text"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-gray-900"
                        placeholder="Ej. Kevin Barra"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    )
}