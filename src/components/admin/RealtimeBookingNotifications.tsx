'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
    const router = useRouter()
    const [notifications, setNotifications] = useState<BookingNotification[]>([])
    const [showPanel, setShowPanel] = useState(false)

    // Audio element for reliable cross-platform sound
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Base64-encoded notification beep sound (short WAV)
    const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleM00teleM00N/OoIABo4e7+/sntsVF1pfZOQgVpbC+vpztqpb0c6aJu/0MCMWjcrS4u/0MCMWjcrS4u/yblsQR8XP4THzc2PVz4qQW+Rt7ytfFxYXWqBi4Z9aWJbYGp0e36AhIOBenNsZl9hbnV5fIF/fnx4c21mX11kaXB0d3l5d3RxbWhjX11mbXN3eXl3dXJuamZhXV1lanF1eHh2c29saWVgXV1lanF1eHh2c25rZ2RgXl5lbHJ2eXl3dHBsaGNfXl9mbXN3eXl3dHBsaGRgXl9lbHJ2eHh2c29sZ2ReXmBlbHJ2eHd1cm9rZ2ReXmBlbHJ2eHd1cm9rZ2ReXmBlbHJ2eHd1cm9rZ2ReXmBl"

    // Create audio element on mount
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND)
        audioRef.current.volume = 0.7
    }, [])

    // Function to play notification sound
    const playNotificationSound = () => {
        console.log('[SOUND] playNotificationSound called')
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play()
                .then(() => console.log('[SOUND] Audio played successfully'))
                .catch(err => console.error('[SOUND] Audio play failed:', err))
        }
    }


    // Sound needs user interaction first to work in browsers
    // We do NOT restore from localStorage because that doesn't count as user interaction
    const [soundEnabled, setSoundEnabled] = useState(false)
    const soundEnabledRef = useRef(false)
    const audioUnlockedRef = useRef(false)

    // Toggle sound on/off
    const toggleSound = () => {
        if (!soundEnabled) {
            // Enabling sound - play once to "unlock" audio
            console.log('[SOUND] Enabling sound...')
            if (audioRef.current) {
                audioRef.current.currentTime = 0
                audioRef.current.play()
                    .then(() => {
                        console.log('[SOUND] Audio unlocked successfully')
                        audioUnlockedRef.current = true
                    })
                    .catch(err => console.error('[SOUND] Audio unlock failed:', err))
            }
            setSoundEnabled(true)
            soundEnabledRef.current = true
        } else {
            // Disabling sound
            console.log('[SOUND] Disabling sound...')
            setSoundEnabled(false)
            soundEnabledRef.current = false
        }
    }


    useEffect(() => {
        const supabase = createClient()

        // Subscribe to broadcast channel for this tenant
        // Listen to ALL booking events
        const channel = supabase
            .channel(`booking-notifications-${tenantId}`)
            .on(
                'broadcast',
                { event: 'new-booking' },
                (payload) => handleBookingEvent('new-booking', payload)
            )
            .on(
                'broadcast',
                { event: 'booking-cancelled' },
                (payload) => handleBookingEvent('booking-cancelled', payload)
            )
            .on(
                'broadcast',
                { event: 'booking-completed' },
                (payload) => handleBookingEvent('booking-completed', payload)
            )
            .on(
                'broadcast',
                { event: 'booking-seated' },
                (payload) => handleBookingEvent('booking-seated', payload)
            )
            .on(
                'broadcast',
                { event: 'booking-noshow' },
                (payload) => handleBookingEvent('booking-noshow', payload)
            )
            .on(
                'broadcast',
                { event: 'booking-updated' },
                (payload) => handleBookingEvent('booking-updated', payload)
            )
            .subscribe((status) => {
                console.log('[REALTIME] Broadcast subscription status:', status)
            })

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId])

    // Handle any booking event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBookingEvent = (eventType: string, payload: Record<string, any>) => {
        console.log(`[REALTIME] ${eventType} received:`, payload)

        const data = payload.payload || payload

        // For new bookings, show notification
        if (eventType === 'new-booking' && data.clientName) {
            const notification: BookingNotification = {
                id: data.id,
                clientName: data.clientName,
                serviceName: data.serviceName || 'Servicio',
                staffName: data.staffName || 'Staff',
                time: data.time || '',
                timestamp: new Date()
            }

            setNotifications(prev => [notification, ...prev].slice(0, 5))

            // Play sound if enabled (using ref to avoid closure issues)
            console.log('[SOUND] Should play? soundEnabledRef.current =', soundEnabledRef.current)
            if (soundEnabledRef.current) {
                console.log('[SOUND] Playing notification sound...')
                playNotificationSound()
            }

            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification('Nueva Reserva', {
                    body: `${data.clientName} - ${data.serviceName}`,
                    icon: '/icon-192.png'
                })
            }
        }

        // Always refresh page data for any booking event
        router.refresh()
    }

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
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Nuevas Reservas</h3>
                        <button
                            onClick={toggleSound}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${soundEnabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                        >
                            {soundEnabled ? '🔔 Sonido ON' : '🔕 Activar Sonido'}
                        </button>
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
