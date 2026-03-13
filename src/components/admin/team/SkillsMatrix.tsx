'use client'

import { useState } from 'react'
import { toggleStaffSkill } from '@/app/admin/team/actions'
import { toast } from 'sonner'
import { Check, Loader2, Sparkles } from 'lucide-react'
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
    staff_category: string
    role_alias: string | null
    services?: string[]
    skills?: string[]
}

export default function SkillsMatrix({
    staff,
    services = [],
    staffLabel = 'Personal'
}: {
    staff: StaffMember[],
    services: { id: string, name: string }[],
    staffLabel?: string
}) {
    const [togglingService, setTogglingService] = useState<string | null>(null)

    const isBarberRole = (role: string) => {
        return role === 'staff' || role === 'owner' || role === 'super_admin'
    }

    const handleSkillToggle = async (memberId: string, serviceId: string, currentEnabled: boolean) => {
        const key = `${memberId}-${serviceId}`
        setTogglingService(key)
        
        const res = await toggleStaffSkill(memberId, serviceId, !currentEnabled)
        
        if (res.error) toast.error(res.error)
        else toast.success(currentEnabled ? 'Competencia removida' : 'Competencia agregada')
        
        setTogglingService(null)
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Matriz de Competencias</h3>
                        <p className="text-xs text-gray-500 mt-1">Gestión masiva de servicios por {staffLabel.toLowerCase()}.</p>
                    </div>
                    <Sparkles className="text-amber-500" size={24} />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-4 border-b border-gray-100 sticky left-0 bg-gray-50 z-10 w-48 min-w-[12rem]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{staffLabel}</span>
                                </th>
                                {services.map(service => (
                                    <th key={service.id} className="p-4 border-b border-gray-100 text-center min-w-[120px]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block leading-tight">
                                            {service.name}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.filter(m => m.status === 'active' && isBarberRole(m.role)).map(member => (
                                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 border-b border-gray-100 sticky left-0 bg-white z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden relative border border-gray-200 flex-shrink-0">
                                                {member.avatar_url ? (
                                                    <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                                                        {member.full_name[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-sm text-gray-900 truncate">{member.full_name.split(' ')[0]}</span>
                                        </div>
                                    </td>
                                    {services.map(service => {
                                        const isEnabled = member.skills?.includes(service.id) || false
                                        const isToggling = togglingService === `${member.id}-${service.id}`
                                        
                                        return (
                                            <td key={service.id} className="p-4 border-b border-gray-100 text-center">
                                                <button
                                                    onClick={() => handleSkillToggle(member.id, service.id, isEnabled)}
                                                    disabled={isToggling}
                                                    className={`
                                                        w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto transition-all
                                                        ${isEnabled 
                                                            ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                                                            : 'bg-white border-gray-100 text-transparent hover:border-gray-300'}
                                                        ${isToggling ? 'opacity-50 cursor-wait' : 'active:scale-90'}
                                                    `}
                                                >
                                                    {isToggling ? (
                                                        <Loader2 size={14} className="animate-spin text-gray-400" />
                                                    ) : (
                                                        <Check size={16} strokeWidth={3} />
                                                    )}
                                                </button>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-amber-50 border-t border-amber-100">
                    <p className="text-[10px] text-amber-700 flex items-center gap-2 font-medium">
                        <Sparkles size={14} />
                        <b>Nota:</b> Si un servicio no tiene personal asignado en esta matriz, aparecerá todo el equipo de esa categoría profesional por defecto.
                    </p>
                </div>
            </div>
        </div>
    )
}
