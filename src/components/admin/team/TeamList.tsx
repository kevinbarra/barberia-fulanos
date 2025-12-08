'use client'

import { useState } from 'react'
import { inviteStaff, removeStaff } from '@/app/admin/team/actions'
import { toast } from 'sonner'
import { User, Mail, Trash2, Plus, ShieldCheck, Clock } from 'lucide-react'
import Image from 'next/image'

type StaffMember = {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    status: 'active' | 'pending'
}

// Agregamos la prop currentUserRole
export default function TeamList({ staff, currentUserRole }: { staff: StaffMember[], currentUserRole: string }) {
    const [isInviting, setIsInviting] = useState(false)

    const handleInvite = async (formData: FormData) => {
        setIsInviting(true)
        const res = await inviteStaff(formData)
        setIsInviting(false)

        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.error)
        }
    }

    const handleRemove = async (id: string) => {
        if (!confirm('¿Seguro que quieres quitar acceso a este miembro?')) return
        const res = await removeStaff(id)
        if (res.success) toast.success(res.message)
        else toast.error(res.error)
    }

    return (
        <div className="space-y-8">

            {/* FORMULARIO DE INVITACIÓN (SOLO OWNER) */}
            {currentUserRole === 'owner' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-blue-600" />
                        Agregar Nuevo Miembro
                    </h3>
                    <form action={handleInvite} className="flex gap-3">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="correo@ejemplo.com"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isInviting}
                            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            {isInviting ? '...' : 'Invitar'}
                        </button>
                    </form>
                    <p className="text-xs text-gray-400 mt-3">
                        * El usuario recibirá acceso Staff la próxima vez que inicie sesión.
                    </p>
                </div>
            )}

            {/* LISTA DE EQUIPO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staff.map((member) => (
                    <div key={member.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-gray-300 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden relative border border-gray-200">
                                {member.avatar_url ? (
                                    <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" sizes="48px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{member.full_name}</h4>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    {member.role === 'owner' ? (
                                        <span className="text-purple-600 font-bold flex items-center gap-1"><ShieldCheck size={10} /> Dueño</span>
                                    ) : (
                                        'Barbero'
                                    )}

                                    {member.status === 'pending' && (
                                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ml-2">
                                            <Clock size={10} /> Pendiente
                                        </span>
                                    )}
                                </p>
                                {/* Mostrar email solo si es Owner/Super_Admin (Privacidad) */}
                                {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{member.email}</p>
                                )}
                            </div>
                        </div>

                        {/* ACCIONES (SOLO OWNER/SUPER_ADMIN puede borrar, y no a sí mismo) */}
                        {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && member.role !== 'owner' && (
                            <button
                                onClick={() => handleRemove(member.id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Revocar acceso"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}