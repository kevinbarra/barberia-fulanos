'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Star, ExternalLink, Loader2, Check, AlertCircle } from 'lucide-react'



export default function GoogleReviewUrlInput() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [savedUrl, setSavedUrl] = useState('')

    // Load current setting on mount
    useEffect(() => {
        async function loadSettings() {
            const result = await getTenantSettings()
            if (result.settings) {
                const settings = result.settings as { google_review_url?: string }
                const existingUrl = settings.google_review_url || ''
                setUrl(existingUrl)
                setSavedUrl(existingUrl)
            }
            setIsLoading(false)
        }
        loadSettings()
    }, [])

    const handleChange = (value: string) => {
        setUrl(value)
        setHasChanges(value !== savedUrl)
    }

    const handleSave = async () => {
        // Basic URL validation
        if (url && !url.startsWith('http')) {
            toast.error('La URL debe comenzar con http:// o https://')
            return
        }

        setIsSaving(true)
        const result = await updateTenantSetting('google_review_url', url)

        if (result.error) {
            toast.error(result.error)
        } else {
            setSavedUrl(url)
            setHasChanges(false)
            toast.success('URL de Google Reviews guardada')
        }

        setIsSaving(false)
    }



    const isValidUrl = url === '' || url.startsWith('http')

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                    <Star className="w-6 h-6 text-amber-600" fill="currentColor" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Google Reviews</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura tu enlace de reseñas para capturar testimonios de clientes satisfechos.
                    </p>
                </div>
            </div>

            {/* URL Input */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                    URL de Google Reviews
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder="https://search.google.com/local/writereview?placeid=..."
                            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${!isValidUrl
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                                }`}
                        />
                        {!isValidUrl && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                        )}
                    </div>
                </div>

                {!isValidUrl && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        La URL debe comenzar con http:// o https://
                    </p>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges || !isValidUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Guardar
                    </button>

                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-100 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Probar Enlace
                        </a>
                    )}


                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                    <strong>💡 Cómo obtener tu URL:</strong> Ve a Google Maps → Tu negocio → "Pedir reseñas" → Copia el enlace.
                </p>
            </div>
        </div>
    )
}
