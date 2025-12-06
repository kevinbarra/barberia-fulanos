'use client'

import { useState, useMemo, useEffect } from 'react'
import { createTicket, finalizeTicket, voidTicket } from '@/app/admin/pos/actions'
import { linkTransactionToUser } from '@/app/admin/bookings/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Banknote, CreditCard, ArrowRightLeft, QrCode, Trash2, Clock, Plus, ChevronLeft, Scissors, X } from 'lucide-react'
import QRScanner from '@/components/admin/QRScanner'
import PointsRedemption from './PointsRedemption'
import { calculatePointsDiscount } from '@/types/loyalty'
import { createTransactionWithPoints, getClientPoints } from '@/app/admin/pos/actions'

// --- TIPOS ---
type Staff = {
    id: string;
    full_name: string;
    avatar_url: string | null
}

type Service = {
    id: string;
    name: string;
    price: number;
    duration_min: number;
    category?: string
}

type Ticket = {
    id: string;
    startTime: string;
    clientName: string;
    staffName: string;
    serviceName: string | null;
    price: number | null;
    staffId?: string;
}

type WebBooking = {
    id: string;
    startTime: string;
    endTime: string;
    clientName: string;
    clientPhone: string;
    staffId: string;
    staffName: string;
    serviceName: string;
    servicePrice: number;
    duration: number;
    status: string;
    isWebBooking: boolean;
    noShowCount?: number;
    customerId?: string | null;
}

const DURATIONS = [15, 30, 45, 60, 90]

export default function PosInterface({
    staff,
    services,
    activeTickets: initialTickets,
    todayBookings = [],
    tenantId
}: {
    staff: Staff[],
    services: Service[],
    activeTickets: Ticket[],
    todayBookings?: WebBooking[],
    tenantId: string
}) {
    // --- ESTADO LOCAL ---
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
    const [bookings, setBookings] = useState<WebBooking[]>(todayBookings)
    const [activeTab, setActiveTab] = useState<'tickets' | 'bookings'>('tickets')

    useEffect(() => {
        setTickets(initialTickets)
    }, [initialTickets])

    useEffect(() => {
        setBookings(todayBookings)
    }, [todayBookings])


    const [mobileTab, setMobileTab] = useState<'list' | 'action'>('list')
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [successTx, setSuccessTx] = useState<{ id: string, points: number } | null>(null)

    // Check-in
    const [selStaff, setSelStaff] = useState<Staff | null>(null)
    const [duration, setDuration] = useState<number>(30)
    const [clientName, setClientName] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    // Checkout
    const [selFinalService, setSelFinalService] = useState<Service | null>(null)
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [showScanner, setShowScanner] = useState(false)
    const [pointsToRedeem, setPointsToRedeem] = useState(0)
    const [clientPoints, setClientPoints] = useState(0)
    const [selectedClient, setSelectedClient] = useState<{ id: string } | null>(null)
    const [isLoadingPoints, setIsLoadingPoints] = useState(false)
    const [selectedServices, setSelectedServices] = useState<Service[]>([])
    const [selectedProducts, setSelectedProducts] = useState<any[]>([])

    useEffect(() => {
        async function loadClientPoints() {
            if (selectedClient) {
                try {
                    // El selectedClient puede venir de diferentes fuentes
                    let clientId: string;

                    // Si viene de un ticket, tiene la estructura { client: { id, name, phone } }
                    if ('client' in selectedClient && (selectedClient as any).client) {
                        clientId = (selectedClient as any).client.id;
                    }
                    // Si es el cliente directo
                    else if ('id' in selectedClient) {
                        clientId = selectedClient.id;
                    } else {
                        console.error('No se pudo obtener el ID del cliente:', selectedClient);
                        setClientPoints(0);
                        return;
                    }

                    const points = await getClientPoints(clientId);
                    setClientPoints(points);
                } catch (error) {
                    console.error('Error loading client points:', error);
                    setClientPoints(0);
                }
            } else {
                setClientPoints(0);
                setPointsToRedeem(0);
            }
        }
        loadClientPoints();
    }, [selectedClient])


    // --- LÓGICA INTELIGENTE ---
    const handleStaffSelect = (member: Staff) => {
        const activeTicket = tickets.find(t => t.staffName.includes(member.full_name))
        if (activeTicket) {
            toast.info(`⚠️ ${member.full_name.split(' ')[0]} ya tiene un servicio en curso.`)
            handleSelectTicket(activeTicket)
        } else {
            setSelStaff(member)
        }
    }

    // --- ACCIONES ---
    const handleCheckIn = async () => {
        if (!selStaff) return
        setIsProcessing(true)

        const res = await createTicket({
            tenantId,
            staffId: selStaff.id,
            clientName: clientName || "Cliente Walk-in",
            duration: duration
        })

        if (res.success) {
            toast.success('Ticket Abierto')
            resetCheckIn()
            setMobileTab('list')
        } else {
            toast.error(res.error)
            setIsProcessing(false)
        }
    }

    const handleCheckout = async () => {
        if (!selectedTicket || !selFinalService) return
        setIsProcessing(true)

        const res = await finalizeTicket({
            bookingId: selectedTicket.id,
            amount: selFinalService.price,
            serviceId: selFinalService.id,
            paymentMethod,
            tenantId,
            pointsRedeemed: pointsToRedeem
        })

        if (res.success && res.transactionId) {
            setSuccessTx({ id: res.transactionId, points: res.points || 0 })
            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))

            if (pointsToRedeem > 0) {
                const discount = calculatePointsDiscount(pointsToRedeem)
                toast.success(`¡Cobro exitoso! Descuento de $${discount.toFixed(2)} aplicado`)
            } else {
                toast.success('¡Cobro exitoso!')
            }
        } else {
            toast.error(res.error)
        }
        setIsProcessing(false)
    }

    const handleVoid = async () => {
        if (!selectedTicket || !confirm("¿Anular ticket? Esto quedará registrado.")) return

        const ticketId = selectedTicket.id
        setTickets(prev => prev.filter(t => t.id !== ticketId))
        setSelectedTicket(null)
        setMobileTab('list')

        const res = await voidTicket(ticketId)
        if (res.success) toast.info("Ticket anulado")
        else toast.error(res.error)
    }

    // --- HELPERS ---
    const handleScanLink = async (userId: string) => {
        if (!successTx) return
        toast.loading('Vinculando...')
        const res = await linkTransactionToUser(successTx.id, userId)
        toast.dismiss()
        if (res.success) {
            toast.success(res.message)
            fullReset()
        } else {
            toast.error(res.message)
        }
    }

    const handleNewTicket = () => {
        setSelectedTicket(null)
        setSuccessTx(null)
        setMobileTab('action')
    }

    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket)
        setSelFinalService(null)
        setSuccessTx(null)
        setMobileTab('action')
    }

    const handleSelectBooking = (booking: WebBooking) => {
        // Convertir la reserva web a un formato compatible con Ticket
        const ticketFromBooking: Ticket = {
            id: booking.id,
            startTime: booking.startTime,
            clientName: booking.clientName,
            staffName: booking.staffName,
            serviceName: booking.serviceName,
            price: booking.servicePrice,
            staffId: booking.staffId
        }
        setSelectedTicket(ticketFromBooking)
        // Pre-seleccionar el servicio de la reserva
        const matchingService = services.find(s => s.name === booking.serviceName && s.price === booking.servicePrice)
        if (matchingService) {
            setSelFinalService(matchingService)
        }

        // Establecer el cliente (el useEffect se encargará de cargar los puntos)
        setSelectedClient(booking.customerId ? { id: booking.customerId } : null)

        setSuccessTx(null)
        setMobileTab('action')
    }

    const handleBackToList = () => {
        setMobileTab('list')
    }

    const resetCheckIn = () => {
        setSelStaff(null)
        setDuration(30)
        setClientName('')
        setIsProcessing(false)
    }

    const fullReset = () => {
        resetCheckIn()
        setSelectedTicket(null)
        setSuccessTx(null)
        setShowScanner(false)
        setMobileTab('list')
        setPointsToRedeem(0)
        setClientPoints(0)
        setSelectedClient(null)
        setSelectedServices([])
        setSelectedProducts([])
    }

    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);
    const categories = Object.keys(groupedServices);
    const [activeCategory, setActiveCategory] = useState(categories[0] || 'General');

    // Calculate total with points discount
    const subtotal = useMemo(() => {
        return [...selectedServices, ...selectedProducts].reduce(
            (sum, item) => sum + item.price,
            0
        );
    }, [selectedServices, selectedProducts]);
    const pointsDiscount = calculatePointsDiscount(pointsToRedeem);
    const total = Math.max(subtotal - pointsDiscount, 0);

    // --- VISTA: PANTALLA DE ÉXITO ---
    if (successTx) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white w-full animate-in zoom-in">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-xl">
                    <CheckCircle size={48} strokeWidth={3} />
                </div>
                <h1 className="text-3xl font-black text-gray-900">¡Venta Cerrada!</h1>

                <div className="mt-8 w-full max-w-md space-y-4">
                    {!showScanner ? (
                        <>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="w-full py-5 bg-black text-white rounded-2xl font-bold text-xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <QrCode size={24} /> Asignar Puntos (QR)
                            </button>
                            <button
                                onClick={fullReset}
                                className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all"
                            >
                                Finalizar
                            </button>
                        </>
                    ) : (
                        <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
                            <div className="h-80 bg-black rounded-3xl overflow-hidden relative border-4 border-black shadow-2xl">
                                <QRScanner onScanSuccess={handleScanLink} onClose={() => setShowScanner(false)} />
                                <button
                                    onClick={() => setShowScanner(false)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md z-50 border border-white/20"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowScanner(false)}
                                className="text-gray-500 text-sm font-medium underline hover:text-black transition-colors"
                            >
                                Cancelar y volver
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col md:flex-row w-full h-full bg-gray-100 relative">
            <div className={`md:w-96 bg-white border-r border-gray-200 flex-col h-full ${mobileTab === 'list' ? 'flex w-full' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full flex items-center gap-1">
                            <ChevronLeft size={24} />
                            <span className="font-bold text-sm text-gray-900">Salir</span>
                        </Link>
                        <div className="hidden md:block">
                            <h2 className="font-bold text-lg text-gray-900">POS</h2>
                            <p className="text-xs text-gray-400">Tickets y reservas</p>
                        </div>
                        <div className="md:hidden">
                            <h2 className="font-bold text-lg text-gray-900">POS</h2>
                        </div>
                    </div>
                    <button onClick={handleNewTicket} className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95">
                        <Plus size={24} />
                    </button>
                </div>

                {/* TABS: Tickets vs Reservas */}
                <div className="flex border-b border-gray-200 bg-white sticky top-[73px] z-10">
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'tickets'
                            ? 'text-black border-b-2 border-black'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        En Silla ({tickets.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'bookings'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Reservas ({bookings.length})
                    </button>
                </div>

                {activeTab === 'tickets' ? (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {tickets.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl m-2">
                                <p>Sala vacía.</p>
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <button key={ticket.id} onClick={() => handleSelectTicket(ticket)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200' : 'bg-white border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900 truncate text-base">{ticket.clientName}</span>
                                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">En curso</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ticket.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>•</span>
                                        <span>{ticket.staffName.split(' ')[0]}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {bookings.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl m-2">
                                <p>Sin reservas hoy.</p>
                            </div>
                        ) : (
                            bookings.map(booking => (
                                <button
                                    key={booking.id}
                                    onClick={() => handleSelectBooking(booking)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === booking.id
                                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200'
                                        : 'bg-white border-gray-100 hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{booking.clientName}</span>
                                            {booking.noShowCount && booking.noShowCount > 0 && (
                                                <span
                                                    className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold"
                                                    title={`${booking.noShowCount} no-show(s) previos`}
                                                >
                                                    ⚠️ {booking.noShowCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>{booking.serviceName}</span>
                                        <span>•</span>
                                        <span>${booking.servicePrice}</span>
                                        <span>•</span>
                                        <span>{booking.staffName.split(' ')[0]}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            <div className={`flex-1 flex-col bg-gray-50 h-full ${mobileTab === 'action' ? 'flex w-full absolute inset-0 z-20 md:static' : 'hidden md:flex'}`}>
                <div className="md:hidden p-4 bg-white border-b border-gray-200 flex items-center gap-3 sticky top-0 z-30">
                    <button onClick={handleBackToList} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} />
                    </button>
                    <span className="font-bold text-gray-900">{selectedTicket ? 'Cerrar Cuenta' : 'Nuevo Cliente'}</span>
                </div>
                {!selectedTicket && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        <div className="hidden md:block p-6 border-b border-gray-200 bg-white">
                            <h1 className="text-2xl font-black text-gray-900">Check-in</h1>
                            <p className="text-gray-500 text-sm">Bloquea el horario para empezar.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                            <section>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">1. Barbero</h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {staff.map(member => {
                                        const isBusy = tickets.some(t => t.staffName.includes(member.full_name));
                                        return (
                                            <button key={member.id} onClick={() => handleStaffSelect(member)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all relative ${selStaff?.id === member.id ? 'border-black bg-black text-white shadow-lg' : 'border-transparent bg-white hover:bg-gray-200'} ${isBusy ? 'opacity-75' : ''}`}>
                                                {isBusy && <span className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow-sm" title="Ocupado"></span>}
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 relative border border-white/20">
                                                    {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">{member.full_name[0]}</div>}
                                                </div>
                                                <span className="text-xs font-bold truncate w-full text-center">{member.full_name.split(' ')[0]}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </section>
                            <section>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">2. Tiempo Estimado</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {DURATIONS.map(min => (
                                        <button key={min} onClick={() => setDuration(min)} className={`px-6 py-4 rounded-xl font-bold text-lg border-2 transition-all ${duration === min ? 'border-black bg-black text-white shadow-lg' : 'bg-white border-gray-200 text-gray-500'}`}>{min}m</button>
                                    ))}
                                </div>
                            </section>
                            <section>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">3. Cliente</h3>
                                <input type="text" placeholder="Nombre (Opcional)" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none bg-white font-medium" />
                            </section>
                        </div>
                        <div className="p-6 bg-white border-t border-gray-200 pb-8 md:pb-6">
                            <button onClick={handleCheckIn} disabled={!selStaff || isProcessing} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-900 disabled:opacity-50 shadow-xl">{isProcessing ? 'Bloqueando...' : 'Iniciar Servicio'}</button>
                        </div>
                    </div>
                )}
                {selectedTicket && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                        <div className="hidden md:flex p-6 border-b border-gray-200 bg-white justify-between items-center">
                            <div><h1 className="text-2xl font-black text-gray-900">Caja</h1><p className="text-gray-500 text-sm">Finalizando servicio.</p></div>
                            <button onClick={handleVoid} className="text-red-500 hover:bg-red-50 p-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 border border-red-100"><Trash2 size={16} /> Anular Ticket</button>
                        </div>
                        <div className="flex-1 p-4 md:p-8 flex flex-col overflow-y-auto">
                            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div><span className="text-xs text-gray-400 uppercase font-bold">Cliente</span><p className="font-bold text-lg">{selectedTicket.clientName}</p></div>
                                <div className="text-right"><span className="text-xs text-gray-400 uppercase font-bold">Atendió</span><p className="font-bold">{selectedTicket.staffName.split(' ')[0]}</p></div>
                            </div>
                            <section className="mb-8 flex-1">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Scissors size={14} /> ¿Qué se realizó?</h3>
                                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scrollbar">
                                    {categories.map(cat => (
                                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>{cat}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {groupedServices[activeCategory]?.map(service => (
                                        <button key={service.id} onClick={() => setSelFinalService(service)} className={`p-3 rounded-xl border-2 text-left transition-all ${selFinalService?.id === service.id ? 'border-green-500 bg-green-50 ring-1 ring-green-500 shadow-md' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                                            <div className="font-bold text-sm text-gray-900">{service.name}</div>
                                            <div className="text-xs text-gray-500 mt-1 font-bold">${service.price}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* LOYALTY POINTS REDEMPTION */}
                            {selectedClient && selFinalService && (
                                <div className="mb-6">
                                    {isLoadingPoints ? (
                                        <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
                                            Cargando puntos del cliente...
                                        </div>
                                    ) : (
                                        <PointsRedemption
                                            clientPoints={clientPoints}
                                            totalAmount={selFinalService.price}
                                            onPointsChange={setPointsToRedeem}
                                        />
                                    )}
                                </div>
                            )}

                            <div className="border-t border-gray-200 pt-6">
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-medium">${selFinalService?.price.toFixed(2) || '0.00'}</span>
                                    </div>

                                    {pointsToRedeem > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Descuento por puntos ({pointsToRedeem}):</span>
                                            <span className="font-medium">-${pointsDiscount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="border-t pt-2 flex justify-between">
                                        <span className="font-semibold text-lg">Total:</span>
                                        <span className="font-bold text-2xl text-blue-600">
                                            ${selFinalService ? (selFinalService.price - pointsDiscount).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[{ id: 'cash', label: 'Efectivo', icon: Banknote }, { id: 'card', label: 'Tarjeta', icon: CreditCard }, { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft }].map(m => (
                                        <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-400'}`}><m.icon size={20} className="mb-1" /><span className="text-[10px] font-bold">{m.label}</span></button>
                                    ))}
                                </div>
                                <button onClick={handleCheckout} disabled={!selFinalService || isProcessing} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all">{isProcessing ? 'Procesando...' : 'Cobrar Final'}</button>
                                <button onClick={handleVoid} className="md:hidden mt-4 w-full py-3 text-red-500 font-bold text-sm">Eliminar Ticket</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}