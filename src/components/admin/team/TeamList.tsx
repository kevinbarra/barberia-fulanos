'use client'

import { useState } from 'react'
import { inviteStaff, removeStaff, changeUserRole, toggleStaffStatus, updateStaffPhone } from '@/app/admin/team/actions'
import { toast } from 'sonner'
import { User, Mail, Trash2, Plus, ShieldCheck, Clock, ChevronDown, Tablet, Scissors, Crown, Calendar, Eye, EyeOff, Phone, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'

type StaffMember = {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    phone: string | null
    status: 'active' | 'pending'
    is_active_barber: boolean
    is_calendar_visible: boolean
}

// Role configuration with labels, colors, and icons
const ROLE_CONFIG = {
    super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700', icon: Crown },
    owner: { label: 'Dueño', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
    staff: { label: 'Barbero', color: 'bg-blue-100 text-blue-700', icon: Scissors },
    kiosk: { label: 'Kiosko', color: 'bg-green-100 text-green-700', icon: Tablet },
    customer: { label: 'Cliente', color: 'bg-gray-100 text-gray-700', icon: User },
}

// Toggle Switch Component
function Toggle({
    enabled,
    onChange,
    disabled,
    loading
}: {
    enabled: boolean;
    onChange: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            disabled={disabled || loading}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
                ${enabled ? 'bg-green-500' : 'bg-gray-200'}
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${enabled ? 'translate-x-5' : 'translate-x-0'}
                    ${loading ? 'animate-pulse' : ''}
                `}
            />
        </button>
    )
}

export default function TeamList({ staff, currentUserRole }: { staff: StaffMember[], currentUserRole: string }) {
    const [isInviting, setIsInviting] = useState(false)
    const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
    const [togglingField, setTogglingField] = useState<string | null>(null) // "memberId-field"
    const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({})
    const [savingPhone, setSavingPhone] = useState<string | null>(null)

    // Initialize phone inputs from props
    const getPhoneValue = (member: StaffMember) => {
        if (member.id in phoneInputs) return phoneInputs[member.id]
        return member.phone || ''
    }

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

    const handleToggle = async (memberId: string, field: 'is_active_barber' | 'is_calendar_visible', currentValue: boolean) => {
        const key = `${memberId}-${field}`
        setTogglingField(key)

        const res = await toggleStaffStatus(memberId, field, !currentValue)

        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.error)
        }

        setTogglingField(null)
    }

    const handlePhoneSave = async (memberId: string) => {
        const phone = phoneInputs[memberId] ?? ''
        setSavingPhone(memberId)
        const res = await updateStaffPhone(memberId, phone)
        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.error)
        }
        setSavingPhone(null)
    }

    // Get available roles based on current user's role
    const getAvailableRoles = (targetRole: string) => {
        if (currentUserRole === 'super_admin') {
            return ['owner', 'staff', 'kiosk', 'customer']
        } else if (currentUserRole === 'owner') {
            if (targetRole === 'owner') return []
            return ['staff', 'kiosk']
        }
        return []
    }

    const canChangeRole = (member: StaffMember) => {
        if (member.status === 'pending') return false
        if (currentUserRole !== 'owner' && currentUserRole !== 'super_admin') return false
        return getAvailableRoles(member.role).length > 0
    }

    const canEditToggles = (member: StaffMember) => {
        // Only show toggles for active staff/owner roles, not pending or kiosk
        if (member.status === 'pending') return false
        if (member.role === 'kiosk' || member.role === 'customer') return false
        // Only managers can edit
        return currentUserRole === 'owner' || currentUserRole === 'super_admin'
    }

    const getRoleInfo = (role: string) => {
        return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.customer
    }

    // Check if staff/owner role (shows toggles)
    const isBarberRole = (role: string) => {
        return role === 'staff' || role === 'owner'
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
                    const showToggles = canEditToggles(member) && isBarberRole(member.role)

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

                                            {openDropdownId === member.id && (
                                                <>
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

                            {/* TOGGLES ROW - Only for staff/owner roles */}
                            {showToggles && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6">
                                    {/* Active Barber Toggle */}
                                    <div className="flex items-center gap-3">
                                        <Scissors size={16} className={member.is_active_barber ? 'text-green-500' : 'text-gray-300'} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">Corta Pelo</span>
                                            <span className="text-xs text-gray-400">Aparece en POS y Reservas</span>
                                        </div>
                                        <Toggle
                                            enabled={member.is_active_barber}
                                            onChange={() => handleToggle(member.id, 'is_active_barber', member.is_active_barber)}
                                            loading={togglingField === `${member.id}-is_active_barber`}
                                        />
                                    </div>

                                    {/* Calendar Visible Toggle */}
                                    <div className="flex items-center gap-3">
                                        {member.is_calendar_visible ? (
                                            <Eye size={16} className="text-blue-500" />
                                        ) : (
                                            <EyeOff size={16} className="text-gray-300" />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">Visible en Calendario</span>
                                            <span className="text-xs text-gray-400">Clientes pueden reservar</span>
                                        </div>
                                        <Toggle
                                            enabled={member.is_calendar_visible}
                                            onChange={() => handleToggle(member.id, 'is_calendar_visible', member.is_calendar_visible)}
                                            loading={togglingField === `${member.id}-is_calendar_visible`}
                                        />
                                    </div>

                                    {/* WhatsApp Phone */}
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Phone size={16} className={getPhoneValue(member) ? 'text-green-500' : 'text-gray-300'} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                                            <span className="text-xs text-gray-400">Citas llegan directo</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                                            <input
                                                type="tel"
                                                value={getPhoneValue(member)}
                                                onChange={(e) => setPhoneInputs(prev => ({ ...prev, [member.id]: e.target.value }))}
                                                placeholder="522291234567"
                                                className="w-36 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50"
                                            />
                                            <button
                                                onClick={() => handlePhoneSave(member.id)}
                                                disabled={savingPhone === member.id}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Guardar WhatsApp"
                                            >
                                                {savingPhone === member.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
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