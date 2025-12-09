'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Delete, Lock, Unlock, AlertCircle } from 'lucide-react'

interface PinModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    title?: string
    description?: string
    correctPin: string // The hashed PIN to verify against
    verifyPin: (pin: string) => Promise<boolean>
}

export default function PinModal({
    isOpen,
    onClose,
    onSuccess,
    title = 'PIN Requerido',
    description = 'Ingresa el PIN de administrador',
    verifyPin
}: PinModalProps) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [attempts, setAttempts] = useState(0)
    const [isLocked, setIsLocked] = useState(false)
    const [lockTimeRemaining, setLockTimeRemaining] = useState(0)
    const [isVerifying, setIsVerifying] = useState(false)

    const MAX_ATTEMPTS = 3
    const LOCK_DURATION = 300 // 5 minutes in seconds

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPin('')
            setError('')
        }
    }, [isOpen])

    // Handle lock timer
    useEffect(() => {
        if (lockTimeRemaining > 0) {
            const timer = setTimeout(() => {
                setLockTimeRemaining(prev => prev - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (lockTimeRemaining === 0 && isLocked) {
            setIsLocked(false)
            setAttempts(0)
        }
    }, [lockTimeRemaining, isLocked])

    const handleNumberClick = useCallback((num: string) => {
        if (isLocked || pin.length >= 4) return
        setError('')
        setPin(prev => prev + num)
    }, [isLocked, pin.length])

    const handleDelete = useCallback(() => {
        if (isLocked) return
        setPin(prev => prev.slice(0, -1))
        setError('')
    }, [isLocked])

    const handleClear = useCallback(() => {
        if (isLocked) return
        setPin('')
        setError('')
    }, [isLocked])

    const handleSubmit = useCallback(async () => {
        if (pin.length !== 4 || isLocked || isVerifying) return

        setIsVerifying(true)
        try {
            const isCorrect = await verifyPin(pin)

            if (isCorrect) {
                setPin('')
                setAttempts(0)
                onSuccess()
                onClose()
            } else {
                const newAttempts = attempts + 1
                setAttempts(newAttempts)
                setPin('')

                if (newAttempts >= MAX_ATTEMPTS) {
                    setIsLocked(true)
                    setLockTimeRemaining(LOCK_DURATION)
                    setError(`Demasiados intentos. Bloqueado por 5 minutos.`)
                } else {
                    setError(`PIN incorrecto. ${MAX_ATTEMPTS - newAttempts} intentos restantes.`)
                }
            }
        } catch {
            setError('Error al verificar PIN')
        } finally {
            setIsVerifying(false)
        }
    }, [pin, isLocked, isVerifying, attempts, verifyPin, onSuccess, onClose])

    // Auto-submit when 4 digits entered
    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit()
        }
    }, [pin, handleSubmit])

    // Handle keyboard input
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handleNumberClick(e.key)
            } else if (e.key === 'Backspace') {
                handleDelete()
            } else if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter' && pin.length === 4) {
                handleSubmit()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, handleNumberClick, handleDelete, handleSubmit, onClose, pin.length])

    if (!isOpen) return null

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isLocked
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                        {isLocked ? (
                            <Lock size={32} className="text-red-600 dark:text-red-400" />
                        ) : (
                            <Unlock size={32} className="text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* PIN Display */}
                <div className="p-6">
                    <div className="flex justify-center gap-3 mb-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${pin.length > i
                                        ? 'bg-blue-600 text-white scale-105'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-300'
                                    } ${isLocked ? 'bg-red-100 dark:bg-red-900/30' : ''}`}
                            >
                                {pin.length > i ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-4 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Lock Timer */}
                    {isLocked && (
                        <div className="text-center text-gray-500 mb-4">
                            Desbloqueando en <span className="font-mono font-bold">{formatTime(lockTimeRemaining)}</span>
                        </div>
                    )}

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                disabled={isLocked || isVerifying}
                                className={`h-16 rounded-xl text-2xl font-bold transition-all active:scale-95 ${isLocked
                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleClear}
                            disabled={isLocked || isVerifying}
                            className="h-16 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={() => handleNumberClick('0')}
                            disabled={isLocked || isVerifying}
                            className={`h-16 rounded-xl text-2xl font-bold transition-all active:scale-95 ${isLocked
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            0
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isLocked || isVerifying}
                            className="h-16 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            <Delete size={24} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}
