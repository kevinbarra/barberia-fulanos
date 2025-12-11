'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Bell, X, Volume2, VolumeX, Check } from 'lucide-react'

interface BookingNotification {
    id: string
    clientName: string
    serviceName: string
    staffName: string
    time: string
    timestamp: Date
    read: boolean
}

interface RealtimeBookingNotificationsProps {
    tenantId: string
}

export default function RealtimeBookingNotifications({ tenantId }: RealtimeBookingNotificationsProps) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<BookingNotification[]>([])
    const [showPanel, setShowPanel] = useState(false)

    // Refs for click-outside detection
    const panelRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Audio for notification sound
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Professional notification sound (pleasant chime)
    // Using a reliable CDN source (freesound or similar standard)
    const NOTIFICATION_SOUND = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"

    // Create audio element on mount
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND)
        audioRef.current.volume = 0.5
    }, [])

    // Sound state management with persistence
    const [soundEnabled, setSoundEnabled] = useState(false)
    const soundEnabledRef = useRef(false)
    const audioInitializedRef = useRef(false)

    // Load preference from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('notificationSound')
        if (stored === 'true') {
            setSoundEnabled(true)
            soundEnabledRef.current = true
        }
    }, [])

    // Toggle sound on/off
    const toggleSound = useCallback(() => {
        const newState = !soundEnabled
        setSoundEnabled(newState)
        soundEnabledRef.current = newState
        localStorage.setItem('notificationSound', String(newState))

        if (newState) {
            console.log('[SOUND] Enabling sound...')
            // Try to unlock audio immediately on user gesture
            if (audioRef.current) {
                audioRef.current.volume = 0.8 // Ensure volume is audible
                audioRef.current.currentTime = 0
                audioRef.current.play()
                    .then(() => {
                        console.log('[SOUND] Audio unlocked successfully')
                        audioInitializedRef.current = true
                    })
                    .catch(err => console.error('[SOUND] Audio unlock failed:', err))
            }
        } else {
            console.log('[SOUND] Disabling sound...')
        }
    }, [soundEnabled])

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        if (soundEnabledRef.current && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => { })
        }
    }, [])

    // Click-outside-to-close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showPanel &&
                panelRef.current &&
                buttonRef.current &&
                !panelRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowPanel(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showPanel])

    // Escape key to close panel
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showPanel) {
                setShowPanel(false)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [showPanel])

    // Supabase subscription
    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`booking-notifications-${tenantId}`)
            .on('broadcast', { event: 'new-booking' }, (payload) => handleBookingEvent('new-booking', payload))
            .on('broadcast', { event: 'booking-cancelled' }, (payload) => handleBookingEvent('booking-cancelled', payload))
            .on('broadcast', { event: 'booking-completed' }, (payload) => handleBookingEvent('booking-completed', payload))
            .on('broadcast', { event: 'booking-seated' }, (payload) => handleBookingEvent('booking-seated', payload))
            .on('broadcast', { event: 'booking-noshow' }, (payload) => handleBookingEvent('booking-noshow', payload))
            .on('broadcast', { event: 'booking-updated' }, (payload) => handleBookingEvent('booking-updated', payload))
            .subscribe((status) => {
                console.log('[REALTIME] Broadcast subscription status:', status)
            })

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBookingEvent = (eventType: string, payload: Record<string, any>) => {
        console.log(`[REALTIME] ${eventType} received:`, payload)
        const data = payload.payload || payload

        if (eventType === 'new-booking' && data.clientName) {
            const notification: BookingNotification = {
                id: data.id,
                clientName: data.clientName,
                serviceName: data.serviceName || 'Servicio',
                staffName: data.staffName || 'Staff',
                time: data.time || '',
                timestamp: new Date(),
                read: false
            }

            setNotifications(prev => [notification, ...prev].slice(0, 10))
            playNotificationSound()

            if (Notification.permission === 'granted') {
                new Notification('Nueva Reserva', {
                    body: `${data.clientName} - ${data.serviceName}`,
                    icon: '/icon-192.png'
                })
            }
        }

        router.refresh()
    }

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAll = () => {
        setNotifications([])
        setShowPanel(false)
    }

    const unreadCount = notifications.filter(n => !n.read).length

    // Format relative time
    const formatTime = (date: Date) => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
        if (diff < 60) return 'Ahora'
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    }

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={buttonRef}
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
            >
                <Bell size={22} className="text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <>
                    {/* Backdrop for mobile */}
                    <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setShowPanel(false)} />

                    <div
                        ref={panelRef}
                        className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-800 dark:text-white">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                        {unreadCount} nuevas
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Sound Toggle */}
                                <button
                                    onClick={toggleSound}
                                    className={`p-2 rounded-lg transition-colors ${soundEnabled
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                                        }`}
                                    title={soundEnabled ? 'Sonido activado' : 'Activar sonido'}
                                >
                                    {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                </button>

                                {soundEnabled && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (audioRef.current) {
                                                audioRef.current.currentTime = 0
                                                audioRef.current.play().catch(err => alert('Error: ' + err.message))
                                            }
                                        }}
                                        className="text-xs text-blue-500 font-bold px-2"
                                    >
                                        PROBAR
                                    </button>
                                )}

                                {/* Mark all as read */}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 transition-colors"
                                        title="Marcar todo como leído"
                                    >
                                        <Check size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-gray-500 dark:text-gray-400">Sin notificaciones</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                        Las nuevas reservas aparecerán aquí
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${notification.read
                                            ? 'bg-white dark:bg-gray-900'
                                            : 'bg-blue-50 dark:bg-blue-900/20'
                                            } hover:bg-gray-50 dark:hover:bg-gray-800`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.read
                                                ? 'bg-gray-100 dark:bg-gray-800'
                                                : 'bg-blue-100 dark:bg-blue-900/50'
                                                }`}>
                                                <span className="text-lg">📅</span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`font-medium truncate ${notification.read
                                                        ? 'text-gray-700 dark:text-gray-300'
                                                        : 'text-gray-900 dark:text-white'
                                                        }`}>
                                                        {notification.clientName}
                                                    </p>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                        {formatTime(notification.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                    {notification.serviceName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    🕐 {notification.time} • {notification.staffName}
                                                </p>
                                            </div>

                                            {/* Dismiss */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    dismissNotification(notification.id)
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                            >
                                                <X size={16} className="text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={clearAll}
                                    className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Limpiar todas las notificaciones
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Toast for latest notification */}
            {notifications.length > 0 && !notifications[0].read && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🔔</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">Nueva Reserva</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {notifications[0].clientName} - {notifications[0].serviceName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {notifications[0].time} • {notifications[0].staffName}
                            </p>
                        </div>
                        <button
                            onClick={() => markAsRead(notifications[0].id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
