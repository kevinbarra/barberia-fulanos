import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
    History,
    User,
    Trash2,
    PlusCircle,
    Edit,
    RotateCcw,
    DollarSign,
    Archive
} from 'lucide-react'

// Helper to format date nicely
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

// Helper to map action to icon/color
function getActionStyle(action: string) {
    switch (action) {
        case 'CREATE': return { icon: <PlusCircle size={16} />, color: 'text-green-600 bg-green-50' }
        case 'UPDATE': return { icon: <Edit size={16} />, color: 'text-blue-600 bg-blue-50' }
        case 'DELETE': return { icon: <Trash2 size={16} />, color: 'text-red-600 bg-red-50' }
        case 'CANCEL': return { icon: <Trash2 size={16} />, color: 'text-red-600 bg-red-50' }
        case 'RESTORE': return { icon: <RotateCcw size={16} />, color: 'text-indigo-600 bg-indigo-50' }
        case 'ARCHIVE': return { icon: <Archive size={16} />, color: 'text-orange-600 bg-orange-50' }
        case 'POS_SALE': return { icon: <DollarSign size={16} />, color: 'text-emerald-600 bg-emerald-50' }
        default: return { icon: <History size={16} />, color: 'text-gray-600 bg-gray-50' }
    }
}

export default async function AuditLogsPage({
    searchParams
}: {
    searchParams: { entity?: string, actor?: string }
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Validate Owner/Admin Access
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['owner', 'super_admin'].includes(profile.role)) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Acceso Restringido</h1>
                <p className="text-gray-600">Solo los dueños pueden ver la auditoría del sistema.</p>
            </div>
        )
    }

    const tenantId = profile.tenant_id

    // 2. Fetch Logs (with Actor names)
    // IMPORTANT: Audit logs requires joining with profiles to get actor names
    let query = supabase
        .from('audit_logs')
        .select(`
            *,
            actor:profiles!actor_id(full_name, email)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)

    if (searchParams.entity) {
        query = query.eq('entity', searchParams.entity)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs, error } = await query as any

    if (error) {
        console.error('Error fetching logs:', error)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="h-6 w-6" />
                        Auditoría del Sistema
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Historial de acciones sensibles (Citas, Clientes, Precios).
                    </p>
                </div>
                <div className="text-sm text-gray-500 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                    🔒 Solo visible para Dueños
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 border-b bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Fecha / Hora</div>
                    <div className="col-span-3">Usuario (Actor)</div>
                    <div className="col-span-2">Acción</div>
                    <div className="col-span-2">Entidad</div>
                    <div className="col-span-3">Detalles</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-100">
                    {!logs || logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay registros de actividad reciente.
                        </div>
                    ) : (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        logs.map((log: any) => {
                            const { icon, color } = getActionStyle(log.action)
                            const actorName = log.actor?.full_name || 'Sistema / Desconocido'
                            const actorEmail = log.actor?.email || ''

                            // Format Metadata for display
                            const metadataKeys = Object.keys(log.metadata || {})
                            const hasPriceChange = log.metadata?.changes?.price
                            const priceChangeText = hasPriceChange
                                ? `Precio: $${hasPriceChange.old} ➝ $${hasPriceChange.new}`
                                : null

                            return (
                                <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-start hover:bg-gray-50 transition-colors">
                                    {/* Date */}
                                    <div className="col-span-2 text-sm text-gray-600 font-medium">
                                        {formatDate(log.created_at)}
                                    </div>

                                    {/* Actor */}
                                    <div className="col-span-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User size={14} className="text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{actorName}</p>
                                                {actorEmail && <p className="text-xs text-gray-400">{actorEmail}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${color}`}>
                                            {icon}
                                            {log.action}
                                        </span>
                                    </div>

                                    {/* Entity */}
                                    <div className="col-span-2 text-sm text-gray-600">
                                        <span className="capitalize px-2 py-1 bg-gray-100 rounded-md">
                                            {log.entity}
                                        </span>
                                        <div className="text-xs text-gray-400 mt-1 truncate" title={log.entity_id}>
                                            ID: {log.entity_id?.slice(0, 8)}...
                                        </div>
                                    </div>

                                    {/* Metadata / Details */}
                                    <div className="col-span-3 text-sm text-gray-600">
                                        {priceChangeText ? (
                                            <div className="font-semibold text-amber-600">{priceChangeText}</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {metadataKeys.slice(0, 3).map(key => (
                                                    <div key={key} className="flex gap-1 text-xs">
                                                        <span className="font-medium text-gray-500">{key}:</span>
                                                        <span className="text-gray-700 truncate max-w-[150px]">
                                                            {JSON.stringify(log.metadata[key])}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
