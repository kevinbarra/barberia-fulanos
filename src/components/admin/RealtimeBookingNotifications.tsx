'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Bell, X } from 'lucide-react'

interface BookingNotification {
    id: string
    clientName: string
    serviceName: string
    staffName: string
    time: string
    timestamp: Date
}

interface RealtimeBookingNotificationsProps {
    tenantId: string
}

export default function RealtimeBookingNotifications({ tenantId }: RealtimeBookingNotificationsProps) {
    const [notifications, setNotifications] = useState<BookingNotification[]>([])
    const [showPanel, setShowPanel] = useState(false)

    // Function to play notification sound using Web Audio API
    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

            // Create oscillator for a pleasant beep
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 880 // A5 note
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.5)

            // Play a second beep for emphasis
            setTimeout(() => {
                const osc2 = audioContext.createOscillator()
                const gain2 = audioContext.createGain()
                osc2.connect(gain2)
                gain2.connect(audioContext.destination)
                osc2.frequency.value = 1100 // Higher note
                osc2.type = 'sine'
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
                osc2.start(audioContext.currentTime)
                osc2.stop(audioContext.currentTime + 0.3)
            }, 200)
        } catch (err) {
            console.log('[REALTIME] Audio failed:', err)
        }
    }

    useEffect(() => {

        const supabase = createClient()

        // Subscribe to bookings table changes for this tenant
        const channel = supabase
            .channel('booking-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bookings',
                    filter: `tenant_id=eq.${tenantId}`
                },
                async (payload) => {
                    console.log('[REALTIME] New booking received:', payload)

                    // Fetch additional details
                    const { data: booking } = await supabase
                        .from('bookings')
                        .select(`
                            id,
                            start_time,
                            notes,
                            services:service_id(name),
                            profiles:staff_id(full_name)
                        `)
                        .eq('id', payload.new.id)
                        .single()

                    if (booking) {
                        const startTime = new Date(booking.start_time)
                        const timeStr = startTime.toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })

                        // Extract client name from notes or use default
                        let clientName = 'Cliente'
                        if (booking.notes) {
                            const match = booking.notes.match(/Cliente:\s*([^|]+)/i)
                            if (match) clientName = match[1].trim()
                        }

                        // Handle Supabase relations (can be array or object)
                        const service = Array.isArray(booking.services)
                            ? booking.services[0]
                            : booking.services
                        const staff = Array.isArray(booking.profiles)
                            ? booking.profiles[0]
                            : booking.profiles

                        const notification: BookingNotification = {
                            id: booking.id,
                            clientName,
                            serviceName: service?.name || 'Servicio',
                            staffName: staff?.full_name || 'Staff',
                            time: timeStr,
                            timestamp: new Date()
                        }

                        // Add to notifications
                        setNotifications(prev => [notification, ...prev].slice(0, 5))

                        // Play sound
                        playNotificationSound()

                        // Show browser notification if permitted
                        if (Notification.permission === 'granted') {
                            new Notification('Nueva Reserva', {
                                body: `${clientName} - ${notification.serviceName} a las ${timeStr}`,
                                icon: '/icon-192.png'
                            })
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('[REALTIME] Subscription status:', status)
            })

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId])

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const unreadCount = notifications.length

    return (
        <>
            {/* Notification Bell Button */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Notificaciones"
            >
                <Bell size={24} className="text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Nuevas Reservas</h3>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Sin notificaciones nuevas</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className="p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {notification.clientName}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {notification.serviceName} con {notification.staffName}
                                            </p>
                                            <p className="text-sm text-blue-600 font-medium mt-1">
                                                🕐 {notification.time}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => dismissNotification(notification.id)}
                                            className="p-1 hover:bg-gray-200 rounded-full"
                                        >
                                            <X size={16} className="text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setNotifications([])}
                                className="w-full text-sm text-gray-600 hover:text-gray-900"
                            >
                                Limpiar todas
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Toast notifications for new bookings */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {notifications.slice(0, 1).map((notification) => (
                    <div
                        key={`toast-${notification.id}`}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce-in flex items-center gap-4 max-w-sm"
                    >
                        <div className="text-2xl">🔔</div>
                        <div className="flex-1">
                            <p className="font-bold">Nueva Reserva</p>
                            <p className="text-sm opacity-90">
                                {notification.clientName} - {notification.serviceName}
                            </p>
                            <p className="text-sm opacity-90">
                                {notification.time} con {notification.staffName}
                            </p>
                        </div>
                        <button
                            onClick={() => dismissNotification(notification.id)}
                            className="p-1 hover:bg-white/20 rounded-full"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </>
    )
}
