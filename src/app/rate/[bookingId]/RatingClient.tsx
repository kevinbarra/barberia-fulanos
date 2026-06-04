'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Send, Loader2, CheckCircle } from 'lucide-react'
import { submitFeedback, markBookingRated } from './actions'
import Image from 'next/image'
import { shiftColorHue, hexToRgba } from '@/lib/colors'
import ClientBackground from '@/components/client/ClientBackground'

interface RatingClientProps {
    bookingId: string
    tenantName: string
    serviceName: string
    staffName: string
    googleReviewUrl: string
    tenantId: string
    customerId?: string
    guestName?: string
    guestEmail?: string
    initialRating?: number
    tenantBrandColor?: string | null
    tenantLogoUrl?: string | null
}

export default function RatingClient({
    bookingId,
    tenantName,
    serviceName,
    staffName,
    googleReviewUrl,
    tenantId,
    customerId,
    guestName,
    guestEmail,
    initialRating,
    tenantBrandColor,
    tenantLogoUrl
}: RatingClientProps) {
    const [rating, setRating] = useState<number>(initialRating || 0)
    const [hoveredRating, setHoveredRating] = useState<number>(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    const brandColor = tenantBrandColor || '#ea2707'
    const secondaryColor = shiftColorHue(brandColor, 40)
    const brandColor5 = hexToRgba(brandColor, 0.05)
    const brandColor10 = hexToRgba(brandColor, 0.10)
    const brandColor40 = hexToRgba(brandColor, 0.40)
    const secondaryColor20 = hexToRgba(secondaryColor, 0.20)

    // If initial rating is >= 4 and we have a Google URL, auto-redirect
    useEffect(() => {
        if (initialRating && initialRating >= 4 && googleReviewUrl) {
            setRedirecting(true)
            markBookingRated(bookingId)
            setTimeout(() => {
                window.location.href = googleReviewUrl
            }, 1500)
        }
    }, [initialRating, googleReviewUrl, bookingId])

    const handleStarClick = async (starValue: number) => {
        setRating(starValue)

        // If 4-5 stars and we have Google URL, redirect
        if (starValue >= 4 && googleReviewUrl) {
            setRedirecting(true)
            await markBookingRated(bookingId)
            setTimeout(() => {
                window.location.href = googleReviewUrl
            }, 1500)
        }
    }

    const handleSubmitFeedback = async () => {
        if (rating === 0) return

        setIsSubmitting(true)

        const result = await submitFeedback({
            bookingId,
            rating,
            comment,
            tenantId,
            customerId,
            guestName,
            guestEmail
        })

        if (result.success) {
            setSubmitted(true)
        }

        setIsSubmitting(false)
    }

    const displayRating = hoveredRating || rating

    return (
        <div 
            style={{
                '--brand-color': brandColor,
                '--brand-color-secondary': secondaryColor,
                '--brand-color-5': brandColor5,
                '--brand-color-10': brandColor10,
                '--brand-color-40': brandColor40,
                '--brand-color-secondary-20': secondaryColor20,
            } as React.CSSProperties}
            className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden selection:bg-[var(--brand-color)]/30"
        >
            <ClientBackground brandColor={brandColor} secondaryColor={secondaryColor} />

            <div className="relative z-10 w-full max-w-md flex flex-col justify-center min-h-[80vh]">
                
                {redirecting && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800/80 shadow-2xl w-full"
                    >
                        <div className="w-20 h-20 bg-[var(--brand-color-10)] border border-[var(--brand-color)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Star className="w-10 h-10 text-[var(--brand-color)]" fill="currentColor" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">¡Gracias por tu calificación!</h1>
                        <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Te estamos llevando a Google para dejar tu reseña...</p>
                        <div className="flex items-center justify-center gap-2 text-[var(--brand-color)]">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-bold uppercase tracking-wider">Redirigiendo</span>
                        </div>
                    </motion.div>
                )}

                {submitted && !redirecting && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800/80 shadow-2xl w-full"
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">¡Gracias por tu comentario!</h1>
                        <p className="text-zinc-400 text-sm leading-relaxed">Tu opinión nos ayuda a mejorar nuestro servicio día a día.</p>
                    </motion.div>
                )}

                {!redirecting && !submitted && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800/80 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full mb-4 overflow-hidden relative border-2 border-zinc-700 shadow-lg">
                                {tenantLogoUrl ? (
                                    <Image src={tenantLogoUrl} alt={tenantName} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-black text-zinc-400">
                                        {tenantName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">{tenantName}</h1>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider leading-relaxed">
                                {serviceName}{staffName ? ` con ${staffName}` : ''}
                            </p>
                        </div>

                        {/* Stars Container */}
                        <div className="bg-zinc-950/40 rounded-3xl p-6 border border-zinc-800/65 mb-6 shadow-inner">
                            <p className="text-center text-zinc-300 mb-5 font-bold text-sm uppercase tracking-wide">
                                ¿Cómo fue tu experiencia?
                            </p>

                            {/* Large Tappable Stars */}
                            <div className="flex justify-center gap-1.5 mb-5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                        key={star}
                                        onClick={() => handleStarClick(star)}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(starValue => 0)}
                                        whileTap={{ scale: 0.9 }}
                                        whileHover={{ scale: 1.1 }}
                                        className="p-1.5 transition-all"
                                    >
                                        <Star
                                            className={`w-12 h-12 transition-all ${
                                                star <= displayRating
                                                    ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]'
                                                    : 'text-zinc-700'
                                            }`}
                                            fill={star <= displayRating ? 'currentColor' : 'none'}
                                            strokeWidth={1.5}
                                        />
                                    </motion.button>
                                ))}
                            </div>

                            {/* Rating Label */}
                            <AnimatePresence mode="wait">
                                {displayRating > 0 && (
                                    <motion.p
                                        key={displayRating}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="text-center text-[var(--brand-color)] font-bold text-xs uppercase tracking-wider"
                                    >
                                        {displayRating === 1 && 'Muy mal 😔'}
                                        {displayRating === 2 && 'Mal 😕'}
                                        {displayRating === 3 && 'Regular 😐'}
                                        {displayRating === 4 && '¡Bien! 😊'}
                                        {displayRating === 5 && '¡Excelente! 🤩'}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Feedback Form (only for 1-3 stars) */}
                        <AnimatePresence>
                            {rating > 0 && rating <= 3 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-4 pt-2">
                                        <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                                            Lamentamos que tu experiencia no haya sido perfecta. ¿Qué podemos mejorar?
                                        </p>

                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Cuéntanos qué sucedió..."
                                            rows={4}
                                            className="w-full bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]/60 focus:border-transparent resize-none text-sm transition-all"
                                        />

                                        <button
                                            onClick={handleSubmitFeedback}
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--brand-color)] text-white rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-[var(--brand-color-40)] border border-[var(--brand-color)]/20 text-sm"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Enviar Comentario
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Manual Google redirect button (if 4-5 stars but no URL configured) */}
                        {rating >= 4 && !googleReviewUrl && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                            >
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
                                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                                    <p className="text-white font-bold text-sm mb-1.5">¡Gracias por tu calificación!</p>
                                    <p className="text-zinc-400 text-xs leading-relaxed font-medium">Tu opinión es de gran valor para nuestro equipo.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Hint text */}
                        {rating === 0 && (
                            <p className="text-center text-zinc-600 text-xs font-bold uppercase tracking-wider animate-pulse">
                                Toca una estrella para calificar
                            </p>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
