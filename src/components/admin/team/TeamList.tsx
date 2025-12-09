'use client'

import { useState } from 'react'
import { inviteStaff, removeStaff, changeUserRole } from '@/app/admin/team/actions'
import { toast } from 'sonner'
import { User, Mail, Trash2, Plus, ShieldCheck, Clock, ChevronDown, Tablet, Scissors, Crown } from 'lucide-react'
import Image from 'next/image'

type StaffMember = {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    status: 'active' | 'pending'
}

// Role configuration with labels, colors, and icons
const ROLE_CONFIG = {
    super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700', icon: Crown },
    owner: { label: 'Dueño', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
    staff: { label: 'Barbero', color: 'bg-blue-100 text-blue-700', icon: Scissors },
    kiosk: { label: 'Kiosko', color: 'bg-green-100 text-green-700', icon: Tablet },
    customer: { label: 'Cliente', color: 'bg-gray-100 text-gray-700', icon: User },
}

// Agregamos la prop currentUserRole
export default function TeamList({ staff, currentUserRole }: { staff: StaffMember[], currentUserRole: string }) {
    const [isInviting, setIsInviting] = useState(false)
    const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

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

    const handleRoleChange = async (memberId: string, newRole: string) => {
        setChangingRoleId(memberId)
        setOpenDropdownId(null)

        const res = await changeUserRole(memberId, newRole)

        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.error)
        }

        setChangingRoleId(null)
    }

    // Get available roles based on current user's role
    const getAvailableRoles = (targetRole: string) => {
        if (currentUserRole === 'super_admin') {
            // Super admin can assign any role
            return ['owner', 'staff', 'kiosk', 'customer']
        } else if (currentUserRole === 'owner') {
            // Owner can only assign staff or kiosk
            // Cannot modify another owner
            if (targetRole === 'owner') return []
            return ['staff', 'kiosk']
        }
        return []
    }

    const canChangeRole = (member: StaffMember) => {
        // Cannot change role of pending invitations
        if (member.status === 'pending') return false

        // Staff/kiosk cannot change any roles
        if (currentUserRole !== 'owner' && currentUserRole !== 'super_admin') return false

        // Check if there are available roles
        return getAvailableRoles(member.role).length > 0
    }

    const getRoleInfo = (role: string) => {
        return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.customer
    }

    return (
        <div className="space-y-8">

            {/* FORMULARIO DE INVITACIÓN (SOLO OWNER O SUPER ADMIN) */}
            {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-blue-600" />
                        Agregar Nuevo Miembro
                    </h3>
                    <form action={handleInvite} className="flex flex-col sm:flex-row gap-3">
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
                            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 whitespace-nowrap"
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
            <div className="space-y-3">
                {staff.map((member) => {
                    const roleInfo = getRoleInfo(member.role)
                    const RoleIcon = roleInfo.icon
                    const availableRoles = getAvailableRoles(member.role)
                    const showRoleDropdown = canChangeRole(member)

                    return (
                        <div
                            key={member.id}
                            className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-300 transition-all"
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Avatar and Info */}
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden relative border border-gray-200 flex-shrink-0">
                                        {member.avatar_url ? (
                                            <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" sizes="48px" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate">{member.full_name}</h4>
                                        {/* Mostrar email solo si es Owner/Super_Admin (Privacidad) */}
                                        {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                                            <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Role Badge / Selector */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {member.status === 'pending' ? (
                                        <span className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                            <Clock size={12} />
                                            Pendiente
                                        </span>
                                    ) : showRoleDropdown ? (
                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenDropdownId(openDropdownId === member.id ? null : member.id)}
                                                disabled={changingRoleId === member.id}
                                                className={`${roleInfo.color} px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50`}
                                            >
                                                <RoleIcon size={12} />
                                                {changingRoleId === member.id ? 'Cambiando...' : roleInfo.label}
                                                <ChevronDown size={12} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openDropdownId === member.id && (
                                                <>
                                                    {/* Backdrop to close dropdown */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenDropdownId(null)}
                                                    />
                                                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[160px]">
                                                        <p className="px-3 py-1 text-xs text-gray-400 font-medium">Cambiar rol a:</p>
                                                        {availableRoles.map((role) => {
                                                            const info = getRoleInfo(role)
                                                            const Icon = info.icon
                                                            return (
                                                                <button
                                                                    key={role}
                                                                    onClick={() => handleRoleChange(member.id, role)}
                                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                                                >
                                                                    <span className={`p-1 rounded ${info.color}`}>
                                                                        <Icon size={12} />
                                                                    </span>
                                                                    {info.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={`${roleInfo.color} px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5`}>
                                            <RoleIcon size={12} />
                                            {roleInfo.label}
                                        </span>
                                    )}

                                    {/* Delete Button */}
                                    {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && member.role !== 'owner' && member.role !== 'super_admin' && (
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Revocar acceso"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Empty State */}
            {staff.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <User size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Sin miembros del equipo</h3>
                    <p className="text-gray-500 text-sm">Invita a tu primer barbero usando el formulario de arriba.</p>
                </div>
            )}
        </div>
    )
}