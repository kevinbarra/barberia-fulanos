'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import {
    CheckCircle, Banknote, CreditCard, ArrowRightLeft,
    Plus, ChevronLeft, Trash2, Clock, User, QrCode, X,
    AlertTriangle, ChevronRight
} from 'lucide-react'
import { createTicket, finalizeTicketV2, voidTicket, seatBooking } from '@/app/admin/pos/actions'
import { linkTransactionToUser } from '@/app/admin/bookings/actions'
import { markNoShow } from '@/app/admin/no-shows/actions'
import QRScanner from '@/components/admin/QRScanner'
import ClientSelector from '@/components/admin/pos/ClientSelector'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Type for selected client from ClientSelector
interface SelectedClient {
    id?: string;
    name: string;
    phone?: string;
    isGuest: boolean;
}

// ==================== TYPES ====================
interface Staff {
    id: string
    full_name: string
    avatar_url: string | null
}

interface Service {
    id: string
    name: string
    price: number
    duration_min: number
    category?: string
}

interface Ticket {
    id: string
    startTime: string
    clientName: string
    staffName: string
    staffId?: string
    services: Service[]
    status: 'active' | 'ready_to_pay'
    customerId?: string | null  // Para saber si es reserva (tiene cliente) o walk-in
}

interface Booking {
    id: string
    startTime: string
    endTime: string
    clientName: string
    clientPhone: string
    staffId: string
    staffName: string
    serviceName: string
    servicePrice: number
    duration: number
    status: string
    customerId?: string | null
    noShowCount?: number
}

interface PosV2Props {
    staff: Staff[]
    services: Service[]
    activeTickets: Ticket[]
    todayBookings: Booking[]
    tenantId: string
}

// ==================== MAIN COMPONENT ====================
export default function PosV2({
    staff,
    services,
    activeTickets: initialTickets,
    todayBookings,
    tenantId
}: PosV2Props) {
    const router = useRouter()

    // === STATE ===
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
    const [bookings, setBookings] = useState<Booking[]>(todayBookings)
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

    // Panel state - Flujos claros:
    // 'idle' = sin selección, 'creating' = bloquear horario, 'viewing' = ticket activo, 'checkout' = cobrar, 'success' = completado
    const [mode, setMode] = useState<'idle' | 'creating' | 'viewing' | 'checkout' | 'success'>('idle')
    const [mobileView, setMobileView] = useState<'list' | 'panel'>('list')

    // New ticket form
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
    const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null)
    const [selectedServices, setSelectedServices] = useState<Service[]>([])
    const [activeCategory, setActiveCategory] = useState('Cortes')

    // Checkout
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
    const [isProcessing, setIsProcessing] = useState(false)
    const [successTxId, setSuccessTxId] = useState<string | null>(null)
    const [showScanner, setShowScanner] = useState(false)
    const [isSeatingBooking, setIsSeatingBooking] = useState<string | null>(null)

    // Ref to prevent duplicate QR scan processing (sync check)
    const isLinkingRef = useRef(false)

    // === EFFECTS ===
    // El servidor es la fuente de verdad - todas las acciones usan admin client
    // No necesitamos merge complejo, solo sincronizar con el servidor
    useEffect(() => {
        setTickets(initialTickets)
    }, [initialTickets])

    useEffect(() => {
        setBookings(todayBookings)
    }, [todayBookings])

    // === COMPUTED ===
    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'General'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(service)
            return acc
        }, {} as Record<string, Service[]>)
    }, [services])

    const categories = Object.keys(groupedServices)

    const total = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.price, 0)
    }, [selectedServices])

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.duration_min, 0)
    }, [selectedServices])

    // === ACTIONS ===
    const handleNewTicket = () => {
        setSelectedTicket(null)
        setMode('creating')
        setMobileView('panel')
        resetForm()
    }

    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket)
        setSelectedServices(ticket.services || [])
        setSelectedStaff(staff.find(s => s.id === ticket.staffId) || null)
        setSelectedClient({ name: ticket.clientName, id: ticket.customerId || undefined, isGuest: !ticket.customerId })
        setMode('viewing')
        setMobileView('panel')
    }

    const handleSelectBooking = (booking: Booking) => {
        // Convert booking to ticket-like object and select it
        const service = services.find(s => s.name === booking.serviceName)
        setSelectedTicket({
            id: booking.id,
            startTime: booking.startTime,
            clientName: booking.clientName,
            staffName: booking.staffName,
            staffId: booking.staffId,
            services: service ? [service] : [],
            status: 'active',
            customerId: booking.customerId  // Pasar el customer_id de la reserva
        })
        setSelectedServices(service ? [service] : [])
        setSelectedStaff(staff.find(s => s.id === booking.staffId) || null)
        setSelectedClient({ name: booking.clientName, id: booking.customerId || undefined, isGuest: !booking.customerId })
        setMode('viewing')
        setMobileView('panel')
    }

    const handleAddService = (service: Service) => {
        setSelectedServices(prev => [...prev, service])
        toast.success(`+${service.name}`)
    }

    const handleRemoveService = (index: number) => {
        setSelectedServices(prev => prev.filter((_, i) => i !== index))
    }

    const handleCreateTicket = async () => {
        if (!selectedStaff || selectedServices.length === 0) {
            toast.error('Selecciona barbero y al menos un servicio')
            return
        }

        setIsProcessing(true)
        const clientName = selectedClient?.name || 'Walk-in'
        const res = await createTicket({
            tenantId,
            staffId: selectedStaff.id,
            clientName,
            duration: totalDuration,
            serviceId: selectedServices[0].id,
            servicePrice: selectedServices[0].price,
            customerId: selectedClient?.id
        })

        setIsProcessing(false)

        if (res.success && res.bookingId) {
            // Create local ticket
            const newTicket: Ticket = {
                id: res.bookingId,
                startTime: new Date().toISOString(),
                clientName,
                customerId: selectedClient?.id,
                staffName: selectedStaff.full_name,
                staffId: selectedStaff.id,
                services: selectedServices,
                status: 'active'
            }

            // Update local state first
            setTickets(prev => [newTicket, ...prev])
            setSelectedTicket(newTicket)
            setMode('viewing')

            toast.success('Ticket creado')

            // Refresh server data in background (won't overwrite our local state immediately 
            // because the useEffect only runs when initialTickets changes from the server)
            router.refresh()
        } else {
            toast.error(res.error || 'Error al crear ticket')
        }
    }

    const handleCheckout = async () => {
        if (!selectedTicket) return

        setIsProcessing(true)
        const res = await finalizeTicketV2({
            bookingId: selectedTicket.id,
            services: selectedServices.map(s => ({ id: s.id, price: s.price })),
            totalAmount: total,
            paymentMethod,
            tenantId
        })

        if (res.success && res.transactionId) {
            setSuccessTxId(res.transactionId)
            setMode('success')
            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))
            toast.success('¡Venta registrada!')
            router.refresh()
        } else {
            toast.error(res.error || 'Error al registrar venta')
        }
        setIsProcessing(false)
    }

    const handleVoid = async () => {
        if (!selectedTicket || !confirm('¿Anular este ticket?')) return

        const res = await voidTicket(selectedTicket.id)
        if (res.success) {
            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))
            toast.info('Ticket anulado')
            handleBack()
            router.refresh()
        } else {
            toast.error(res.error || 'Error al anular')
        }
    }

    const handleScanLink = async (userId: string) => {
        // SYNC CHECK: Prevent duplicate processing while async operation runs
        if (isLinkingRef.current) {
            console.log('[QR] Duplicate scan ignored - already processing')
            return
        }

        // Set ref BEFORE closing scanner to block any queued callbacks
        isLinkingRef.current = true

        // Cerrar scanner inmediatamente
        setShowScanner(false)

        if (!successTxId) {
            isLinkingRef.current = false
            return
        }

        toast.loading('Vinculando puntos...')
        const res = await linkTransactionToUser(successTxId, userId)
        toast.dismiss()

        if (res.success) {
            toast.success(res.message, { duration: 3000 })
            router.refresh()
            handleBack()
        } else {
            toast.error(res.message)
            // Re-abrir scanner si falla para re-intentar
            setShowScanner(true)
        }

        // Reset ref after completion
        isLinkingRef.current = false
    }

    const handleBack = () => {
        setMode('idle')
        setSelectedTicket(null)
        setMobileView('list')
        resetForm()
    }

    const resetForm = () => {
        setSelectedStaff(null)
        setSelectedClient(null)
        setSelectedServices([])
        setPaymentMethod('cash')
        setSuccessTxId(null)
        setShowScanner(false)
    }

    const handleMarkNoShow = async (bookingId: string) => {
        if (!confirm('¿Marcar como no-show?')) return
        const res = await markNoShow(bookingId)
        if (res.success) {
            toast.success('Marcado como no-show')
            setBookings(prev => prev.filter(b => b.id !== bookingId))
            router.refresh()
        } else {
            toast.error(res.error || 'Error')
        }
    }

    const handleSeatBooking = async (bookingId: string) => {
        setIsSeatingBooking(bookingId)
        const res = await seatBooking(bookingId)
        setIsSeatingBooking(null)

        if (res.success) {
            toast.success('🪑 Cliente en silla')
            // Remove from bookings list and add to tickets
            const booking = bookings.find(b => b.id === bookingId)
            if (booking) {
                setBookings(prev => prev.filter(b => b.id !== bookingId))
                const service = services.find(s => s.name === booking.serviceName)
                const newTicket: Ticket = {
                    id: booking.id,
                    startTime: new Date().toISOString(),
                    clientName: booking.clientName,
                    staffName: booking.staffName,
                    staffId: booking.staffId,
                    services: service ? [service] : [],
                    status: 'active',
                    customerId: booking.customerId
                }
                setTickets(prev => [newTicket, ...prev])

                // UX UPGRADE: Auto-select the ticket immediately
                handleSelectTicket(newTicket)
            }
            router.refresh()
        } else {
            toast.error(res.error || 'Error al sentar cliente')
        }
    }

    // === RENDER: SUCCESS ===
    if (mode === 'success') {
        const isWalkIn = !selectedTicket?.customerId

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">¡Venta Registrada!</h1>
                <p className="text-gray-500 mb-2">${total} • {paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</p>

                {/* Reserva: Puntos asignados automáticamente */}
                {!isWalkIn && (
                    <div className="w-full max-w-sm space-y-3 mt-6">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-green-700 font-medium">
                                ✨ Puntos asignados a {selectedTicket?.clientName}
                            </p>
                        </div>
                        <button
                            onClick={handleBack}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold"
                        >
                            Finalizar
                        </button>
                    </div>
                )}

                {/* Walk-in: Opción de escanear QR para puntos */}
                {isWalkIn && !showScanner && (
                    <div className="w-full max-w-sm space-y-3 mt-6">
                        <button
                            onClick={() => setShowScanner(true)}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <QrCode className="w-5 h-5" />
                            Asignar Puntos (QR)
                        </button>
                        <button
                            onClick={handleBack}
                            className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold"
                        >
                            Finalizar sin puntos
                        </button>
                    </div>
                )}

                {/* Walk-in: QR Scanner activo */}
                {isWalkIn && showScanner && (
                    <div className="w-full max-w-sm mt-6">
                        <div className="h-72 bg-black rounded-2xl overflow-hidden relative">
                            <QRScanner onScanSuccess={handleScanLink} onClose={() => setShowScanner(false)} />
                            <button
                                onClick={() => setShowScanner(false)}
                                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowScanner(false)}
                            className="mt-4 text-gray-500 text-sm w-full text-center"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // === RENDER: MAIN ===
    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
            {/* === LEFT PANEL: Tickets & Bookings === */}
            <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col ${mobileView === 'panel' ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg text-gray-900">Terminal POS</h1>
                            <p className="text-xs text-gray-400">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
                        </div>
                    </div>
                    {/* Botón "+" movido al Dashboard principal, pero mantenido aquí para acceso rápido */}
                    <button
                        onClick={handleNewTicket}
                        className="w-10 h-10 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                        title="Nuevo Walk-in"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto">
                    {/* Active Tickets */}
                    <div className="p-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">
                            En Silla ({tickets.length})
                        </h3>
                        {tickets.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                Sin clientes activos
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tickets.map(ticket => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => handleSelectTicket(ticket)}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedTicket?.id === ticket.id
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-100 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-gray-900">{ticket.clientName}</span>
                                                <p className="text-xs text-gray-500">{ticket.staffName}</p>
                                            </div>
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                                Active
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(ticket.startTime), 'HH:mm')}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bookings (Sidebar view - reduced prominence in favor of Dashboard) */}
                    <div className="p-3 pt-0">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">
                            Por Llegar ({bookings.length})
                        </h3>
                        {bookings.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                No hay más reservas hoy
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {bookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        className="p-3 rounded-xl border border-gray-100 bg-white opacity-75 hover:opacity-100 transition-opacity"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div
                                                onClick={() => handleSelectBooking(booking)}
                                                className="flex-1 cursor-pointer"
                                            >
                                                <span className="font-semibold text-gray-900">{booking.clientName}</span>
                                                <p className="text-xs text-gray-500">{format(new Date(booking.startTime), 'HH:mm')} • {booking.serviceName}</p>
                                            </div>
                                            {/* Minimal action button in sidebar */}
                                            <button
                                                onClick={() => handleSeatBooking(booking.id)}
                                                disabled={isSeatingBooking === booking.id}
                                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg disabled:opacity-50"
                                                title="Sentar ahora"
                                            >
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === RIGHT PANEL: Work Area === */}
            <div className={`flex-1 flex flex-col bg-gray-50 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden p-4 bg-white border-b border-gray-200 flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-gray-900">
                        {mode === 'creating' ? 'Bloquear Horario' : mode === 'viewing' ? 'Ticket Activo' : 'Cobrar'}
                    </span>
                </div>

                {/* IDLE STATE: SMART DASHBOARD */}
                {mode === 'idle' && (
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-8">

                            {/* 1. Quick Action: Walk-in */}
                            <button
                                onClick={handleNewTicket}
                                className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5 hover:border-amber-500 hover:shadow-md transition-all group"
                            >
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                                    <Plus className="w-8 h-8 text-amber-600 group-hover:text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">Nuevo Walk-in</h2>
                                    <p className="text-gray-500">Registrar cliente sin reserva previa</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-amber-50">
                                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-amber-500" />
                                </div>
                            </button>

                            {/* 2. Upcoming Bookings Grid */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-gray-500" />
                                    Próximas Citas
                                </h2>

                                {bookings.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                                        <p className="text-gray-400">Todo tranquilo. No hay citas pendientes por ahora.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {bookings.map(booking => (
                                            <div
                                                key={booking.id}
                                                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-900">{booking.clientName}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                                                                {format(new Date(booking.startTime), 'h:mm a')}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{booking.serviceName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <span className="text-sm text-gray-600 font-medium">{booking.staffName}</span>
                                                        </div>
                                                    </div>
                                                    {/* Price Tag */}
                                                    <span className="font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                                                        ${booking.servicePrice}
                                                    </span>
                                                </div>

                                                {/* ACTION BUTTON */}
                                                <button
                                                    onClick={() => handleSeatBooking(booking.id)}
                                                    disabled={isSeatingBooking === booking.id}
                                                    className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
                                                >
                                                    {isSeatingBooking === booking.id ? (
                                                        <span className="animate-pulse">Procesando...</span>
                                                    ) : (
                                                        <>
                                                            <ArrowRightLeft className="w-5 h-5" />
                                                            SENTAR AHORA
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATING / VIEWING / CHECKOUT STATE */}
                {(mode === 'creating' || mode === 'viewing' || mode === 'checkout') && (

                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Top Section: Staff & Client */}
                        <div className="p-4 bg-white border-b border-gray-200">
                            <div className="flex items-center gap-4 mb-4">
                                {/* Staff Selector */}
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Barbero</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {staff.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => setSelectedStaff(member)}
                                                className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${selectedStaff?.id === member.id
                                                    ? 'border-amber-500 bg-amber-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                                    {member.avatar_url ? (
                                                        <Image src={member.avatar_url} alt={member.full_name} width={40} height={40} className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                            {member.full_name[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 truncate w-16 text-center">
                                                    {member.full_name.split(' ')[0]}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Client Selector - Search, Register, or Guest */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Cliente</label>
                                <ClientSelector
                                    onSelect={(client) => setSelectedClient(client)}
                                    initialClientName={selectedClient?.name || ''}
                                />
                            </div>
                        </div>

                        {/* Services Grid */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Agregar Servicios</label>

                            {/* Category Tabs */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Service Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {groupedServices[activeCategory]?.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleAddService(service)}
                                        className="p-4 bg-white rounded-xl border border-gray-200 text-left hover:border-amber-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="font-bold text-gray-900 group-hover:text-amber-600">{service.name}</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-lg font-black text-amber-600">${service.price}</span>
                                            <span className="text-xs text-gray-400">{service.duration_min}min</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Section - Mode Specific */}
                        <div className="bg-white border-t border-gray-200 p-4">
                            {/* Selected Services - always shown */}
                            {selectedServices.length > 0 && (
                                <div className="mb-4 space-y-2 max-h-32 overflow-y-auto">
                                    {selectedServices.map((service, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                                            <span className="text-sm font-medium text-gray-700">{service.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">${service.price}</span>
                                                <button
                                                    onClick={() => handleRemoveService(idx)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MODE: CREATING - Simple: just block the time */}
                            {mode === 'creating' && (
                                <>
                                    <div className="flex justify-between items-center mb-4 py-2 text-gray-500">
                                        <span className="text-sm">Duración estimada</span>
                                        <span className="font-bold">{totalDuration} min</span>
                                    </div>
                                    <button
                                        onClick={handleCreateTicket}
                                        disabled={!selectedStaff || selectedServices.length === 0 || isProcessing}
                                        className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Clock className="w-5 h-5" />
                                        {isProcessing ? 'Bloqueando...' : 'Bloquear Horario'}
                                    </button>
                                </>
                            )}

                            {/* MODE: VIEWING - Show ticket info + checkout button */}
                            {mode === 'viewing' && (
                                <>
                                    {/* Ticket Info */}
                                    <div className="flex justify-between items-center mb-4 py-3 border-t border-gray-200">
                                        <div>
                                            <span className="text-gray-600 font-medium">Total a cobrar</span>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {selectedServices.length} servicio(s)
                                            </p>
                                        </div>
                                        <span className="text-2xl font-black text-gray-900">${total}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleVoid}
                                            className="px-4 py-4 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors"
                                            title="Anular ticket"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setMode('checkout')}
                                            disabled={selectedServices.length === 0}
                                            className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Banknote className="w-5 h-5" />
                                            Cobrar ${total}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* MODE: CHECKOUT - Payment method selection */}
                            {mode === 'checkout' && (
                                <>
                                    <div className="flex justify-between items-center mb-4 py-3 border-t border-gray-200">
                                        <span className="text-gray-600 font-medium">Total</span>
                                        <span className="text-2xl font-black text-gray-900">${total}</span>
                                    </div>

                                    {/* Payment Methods */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {[
                                            { id: 'cash', label: 'Efectivo', icon: Banknote },
                                            { id: 'card', label: 'Tarjeta', icon: CreditCard },
                                            { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft }
                                        ].map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id as 'cash' | 'card' | 'transfer')}
                                                className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${paymentMethod === method.id
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                            >
                                                <method.icon className="w-5 h-5 mb-1" />
                                                <span className="text-xs font-bold">{method.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setMode('viewing')}
                                            className="px-4 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleCheckout}
                                            disabled={isProcessing}
                                            className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            {isProcessing ? 'Registrando...' : `Registrar $${total}`}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
