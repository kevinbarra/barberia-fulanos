'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Send, Loader2, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react'
import { submitFeedback, markBookingRated } from './actions'

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
    initialRating
}: RatingClientProps) {
    const [rating, setRating] = useState<number>(initialRating || 0)
    const [hoveredRating, setHoveredRating] = useState<number>(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

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

    // Show redirecting screen
    if (redirecting) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Star className="w-10 h-10 text-amber-400" fill="currentColor" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">¡Gracias por tu calificación!</h1>
                    <p className="text-zinc-400 mb-6">Te estamos llevando a Google para dejar tu reseña...</p>
                    <div className="flex items-center justify-center gap-2 text-amber-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Redirigiendo</span>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Show thank you screen after feedback submission
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">¡Gracias por tu comentario!</h1>
                    <p className="text-zinc-400">Tu opinión nos ayuda a mejorar nuestro servicio.</p>
                </motion.div>
            </div>
        )
    }

    const displayRating = hoveredRating || rating

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">{tenantName}</h1>
                    <p className="text-zinc-400">
                        {serviceName}{staffName ? ` con ${staffName}` : ''}
                    </p>
                </div>

                {/* Stars Container */}
                <div className="bg-zinc-800/50 backdrop-blur-sm rounded-3xl p-8 border border-zinc-700/50 mb-6">
                    <p className="text-center text-zinc-300 mb-6 text-lg">
                        ¿Cómo fue tu experiencia?
                    </p>

                    {/* Large Tappable Stars */}
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                                key={star}
                                onClick={() => handleStarClick(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                className="p-2 transition-all"
                            >
                                <Star
                                    className={`w-14 h-14 sm:w-16 sm:h-16 transition-all ${star <= displayRating
                                            ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                                            : 'text-zinc-600'
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
                                className="text-center text-zinc-400 text-sm"
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
                            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-3xl p-6 border border-zinc-700/50">
                                <p className="text-zinc-300 mb-4 text-sm">
                                    Lamentamos que tu experiencia no haya sido perfecta. ¿Qué podemos mejorar?
                                </p>

                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Cuéntanos qué sucedió..."
                                    rows={4}
                                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                />

                                <button
                                    onClick={handleSubmitFeedback}
                                    disabled={isSubmitting}
                                    className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
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
                        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <p className="text-white font-medium mb-2">¡Gracias por tu calificación!</p>
                            <p className="text-zinc-400 text-sm">Tu opinión es muy valiosa para nosotros.</p>
                        </div>
                    </motion.div>
                )}

                {/* Hint text */}
                {rating === 0 && (
                    <p className="text-center text-zinc-500 text-sm">
                        Toca una estrella para calificar
                    </p>
                )}
            </motion.div>
        </div>
    )
}
