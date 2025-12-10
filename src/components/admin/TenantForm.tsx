'use client'

import { useState } from 'react'
import { updateTenant } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Loader2, Upload, Globe, Building } from 'lucide-react'
import Image from 'next/image'

type Tenant = {
    name: string;
    slug: string;
    logo_url: string | null;
}

export default function TenantForm({ initialData }: { initialData: Tenant }) {
    const [isSaving, setIsSaving] = useState(false)
    const [preview, setPreview] = useState(initialData.logo_url)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setIsSaving(true)
        try {
            const res = await updateTenant(formData)
            if (res?.error) toast.error(res.error)
            else toast.success(res?.message)
        } catch (e) {
            toast.error('Error de conexión')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <form action={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-2xl">

            {/* LOGO */}
            <div className="mb-8 text-center">
                <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-50 group">
                    {preview ? (
                        <Image src={preview} alt="Logo" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Building size={40} />
                        </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-xs">
                        <Upload size={20} className="mb-1" />
                        <input type="file" name="logo" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
                <p className="text-xs text-gray-400">Toca para cambiar el logo</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Negocio</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={initialData.name}
                        required
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-black focus:border-black transition-all"
                        placeholder="Ej. Barbería El Rey"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Enlace Público (Slug)</label>
                    <div className="flex items-center">
                        <span className="bg-gray-100 border border-r-0 border-gray-300 p-3 rounded-l-xl text-gray-500 text-sm">
                            agendabarber.pro/book/
                        </span>
                        <input
                            type="text"
                            name="slug"
                            defaultValue={initialData.slug}
                            required
                            className="flex-1 p-3 border border-gray-300 rounded-r-xl focus:ring-black focus:border-black transition-all font-mono text-sm"
                            placeholder="el-rey"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Globe size={12} /> Este será el link para tus clientes.
                    </p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving && <Loader2 className="animate-spin" size={18} />}
                    Guardar Cambios
                </button>
            </div>
        </form>
    )
}