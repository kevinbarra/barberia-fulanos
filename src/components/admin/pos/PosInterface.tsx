'use client'

import { useState, useMemo, useEffect } from 'react'
import { processPosSale } from '@/app/admin/pos/actions'
import { linkTransactionToUser as linkGlobal } from '@/app/admin/bookings/actions'
import { toast } from 'sonner'
import Image from 'next/image'
import { User, CheckCircle, Banknote, CreditCard, ArrowRightLeft, QrCode, RotateCcw, Scissors, ChevronUp } from 'lucide-react'
import QRScanner from '@/components/admin/QRScanner'
import { motion, useAnimation, PanInfo } from 'framer-motion'

type Staff = { id: string; full_name: string; avatar_url: string | null }
type Service = { id: string; name: string; price: number; duration_min: number; category?: string }

export default function PosInterface({
    staff,
    services,
    tenantId
}: {
    staff: Staff[],
    services: Service[],
    tenantId: string
}) {
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [isProcessing, setIsProcessing] = useState(false)
    const [successTx, setSuccessTx] = useState<{ id: string, points: number } | null>(null)
    const [showScanner, setShowScanner] = useState(false)

    // Animación
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const controls = useAnimation()

    // --- 1. AUTO-OPEN (UX) ---
    useEffect(() => {
        if (selectedStaff && selectedService) {
            setIsMobileOpen(true)
        }
    }, [selectedStaff, selectedService])

    // --- 2. CANDADO DE ESCRITORIO (FIX BUG VISUAL) ---
    useEffect(() => {
        // Función para forzar el reset en desktop
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                // Si es pantalla grande, FORZAMOS posición 0 inmediatamente
                controls.set({ y: 0 })
            } else {
                // Si es móvil, respetamos el estado abierto/cerrado
                controls.start(isMobileOpen ? { y: 0 } : { y: "calc(100% - 90px)" })
            }
        }

        // Ejecutar al inicio y al redimensionar
        handleResize()
        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [isMobileOpen, controls])

    // --- 3. GESTOS (Solo afectan si no estamos en desktop por CSS, pero esto asegura la lógica) ---
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (window.innerWidth >= 1024) return; // No permitir arrastre en desktop

        const threshold = 100
        const velocity = 500

        if (info.offset.y < -threshold || info.velocity.y < -velocity) {
            setIsMobileOpen(true)
        } else if (info.offset.y > threshold || info.velocity.y > velocity) {
            setIsMobileOpen(false)
        } else {
            controls.start(isMobileOpen ? { y: 0 } : { y: "calc(100% - 90px)" })
        }
    }

    const handleTap = () => {
        if (window.innerWidth < 1024) setIsMobileOpen(!isMobileOpen)
    }

    // --- LÓGICA NEGOCIO ---
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

    const handleCheckout = async () => {
        if (!selectedStaff || !selectedService) return
        setIsProcessing(true)
        const result = await processPosSale({
            tenantId,
            staffId: selectedStaff.id,
            serviceId: selectedService.id,
            price: selectedService.price,
            duration: selectedService.duration_min,
            paymentMethod
        })
        setIsProcessing(false)
        if (result.success && result.transactionId) {
            setSuccessTx({ id: result.transactionId, points: result.points || 0 })
            toast.success('Venta registrada 💰')
        } else {
            toast.error(result.error)
        }
    }

    const handleScanLink = async (userId: string) => {
        if (!successTx) return
        toast.loading('Vinculando...')
        const res = await linkGlobal(successTx.id, userId)
        toast.dismiss()
        if (res.success) {
            toast.success(res.message)
            resetPos()
        } else {
            toast.error(res.message)
        }
    }

    const resetPos = () => {
        setSelectedStaff(null)
        setSelectedService(null)
        setSuccessTx(null)
        setShowScanner(false)
        setPaymentMethod('cash')
        setIsMobileOpen(false)
    }

    if (successTx) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 animate-in zoom-in pb-24">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-xl">
                    <CheckCircle size={48} strokeWidth={3} />
                </div>
                <h1 className="text-3xl font-black text-gray-900">¡Cobro Exitoso!</h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Esta compra genera <strong className="text-black">+{successTx.points} puntos</strong>.
                </p>
                <div className="mt-8 w-full max-w-md space-y-4">
                    {!showScanner ? (
                        <>
                            <button onClick={() => setShowScanner(true)} className="w-full py-5 bg-black text-white rounded-2xl font-bold text-xl shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                                <QrCode size={24} /> Vincular Cliente
                            </button>
                            <button onClick={resetPos} className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all">
                                Finalizar (Anónimo)
                            </button>
                        </>
                    ) : (
                        <div className="h-80 bg-black rounded-3xl overflow-hidden relative border-4 border-black shadow-2xl">
                            <QRScanner onScanSuccess={handleScanLink} onClose={() => setShowScanner(false)} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 h-[calc(100vh-100px)] lg:h-[calc(100vh-140px)] relative overflow-hidden">

            {/* 1. SELECCIÓN */}
            <div className="flex-1 overflow-y-auto pb-32 lg:pb-0 lg:col-span-2 flex flex-col gap-6 px-1 hide-scrollbar">
                {/* Staff */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">¿Quién atiende?</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {staff.map(member => (
                            <button key={member.id} onClick={() => setSelectedStaff(member)} className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all w-24 snap-center ${selectedStaff?.id === member.id ? 'border-black bg-black text-white shadow-md scale-105' : 'border-transparent bg-white hover:bg-gray-50'}`}>
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 relative">
                                    {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">{member.full_name[0]}</div>}
                                </div>
                                <span className="text-xs font-bold truncate w-full text-center">{member.full_name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Servicios */}
                <section>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-2">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-black text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {groupedServices[activeCategory]?.map(service => (
                            <button key={service.id} onClick={() => setSelectedService(service)} className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedService?.id === service.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                                <div className="flex flex-col"><span className="font-bold text-sm">{service.name}</span><span className="text-xs text-gray-500">{service.duration_min} min</span></div>
                                <span className="font-black text-lg">${service.price}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* 2. PANEL DE PAGO (Blindado contra Desktop) */}
            <motion.div
                animate={controls}
                initial={{ y: 0 }} // Empezamos en 0 para evitar flicker en desktop
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                drag={typeof window !== 'undefined' && window.innerWidth < 1024 ? "y" : false} // Solo drag en móvil
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-50 h-[85vh] flex flex-col border border-gray-200
                           lg:static lg:h-full lg:transform-none lg:rounded-3xl lg:shadow-xl lg:border-gray-100 lg:z-0"
            >
                {/* Handle Móvil */}
                <div className="lg:hidden w-full pt-4 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-white rounded-t-[30px]" onPointerDown={(e) => e.preventDefault()} onClick={handleTap}>
                    <div className="w-16 h-1.5 bg-gray-300 rounded-full mb-4"></div>
                    {!isMobileOpen && (
                        <div className="w-full px-6 flex justify-between items-center mb-2 animate-in fade-in">
                            <span className="text-gray-500 text-xs font-bold uppercase">Total a pagar</span>
                            <div className="flex items-center gap-3"><span className="text-2xl font-black tracking-tighter">${selectedService?.price || 0}</span><ChevronUp size={20} className="text-gray-400" /></div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
                    <div className="flex justify-between items-center mb-6 hidden lg:flex">
                        <h2 className="font-black text-2xl">Ticket Actual</h2>
                        <button onClick={resetPos} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full"><RotateCcw size={20} /></button>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className={`p-3 rounded-xl flex items-center gap-3 ${selectedStaff ? 'bg-gray-50' : 'bg-red-50 border border-red-100 border-dashed'}`}>
                            <User size={20} className={selectedStaff ? 'text-black' : 'text-red-300'} />
                            {selectedStaff ? <span className="font-bold">{selectedStaff.full_name}</span> : <span className="text-red-400 text-sm italic">Falta barbero</span>}
                        </div>
                        <div className={`p-3 rounded-xl flex items-center gap-3 ${selectedService ? 'bg-gray-50' : 'bg-red-50 border border-red-100 border-dashed'}`}>
                            <Scissors size={20} className={selectedService ? 'text-black' : 'text-red-300'} />
                            {selectedService ? (<div className="flex-1 flex justify-between"><span className="font-bold text-sm">{selectedService.name}</span><span className="font-mono font-bold">${selectedService.price}</span></div>) : <span className="text-red-400 text-sm italic">Falta servicio</span>}
                        </div>
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Método de Pago</h3>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {[{ id: 'cash', label: 'Efectivo', icon: Banknote }, { id: 'card', label: 'Tarjeta', icon: CreditCard }, { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft }].map(m => (
                            <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400'}`}><m.icon size={20} /><span className="text-[10px] font-bold mt-1">{m.label}</span></button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 p-6 bg-white mt-auto">
                    <div className="flex justify-between items-center mb-4 lg:mb-6">
                        <div className="flex flex-col"><span className="text-gray-500 text-xs font-medium uppercase">Total Final</span><span className="text-3xl font-black tracking-tighter">${selectedService?.price || 0}</span></div>
                    </div>
                    <button onClick={handleCheckout} disabled={!selectedStaff || !selectedService || isProcessing} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2">{isProcessing ? '...' : 'COBRAR'}</button>
                </div>
            </motion.div>
        </div>
    )
}