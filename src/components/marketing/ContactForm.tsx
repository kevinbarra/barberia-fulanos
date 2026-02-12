'use client'

import { useState } from 'react'
import { Building, Mail, Phone, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        businessName: '',
        email: '',
        phone: '',
        message: ''
    })

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('¡Mensaje enviado! Te contactaremos en menos de 24 horas.')
                setFormData({ businessName: '', email: '', phone: '', message: '' })
            } else {
                toast.error(data.error || 'Error al enviar. Intenta de nuevo.')
            }
        } catch (error) {
            toast.error('Error de conexión. Verifica tu internet.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleContactSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        <Building className="inline w-4 h-4 mr-2" />
                        Nombre del negocio
                    </label>
                    <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                        placeholder="Tu barbería"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        <Mail className="inline w-4 h-4 mr-2" />
                        Email
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="correo@ejemplo.com"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Teléfono (opcional)
                </label>
                <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 55 1234 5678"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                    <MessageSquare className="inline w-4 h-4 mr-2" />
                    ¿En qué podemos ayudarte?
                </label>
                <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={4}
                    placeholder="Cuéntanos sobre tu barbería y qué necesitas..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <>Enviando...</>
                ) : (
                    <>
                        Enviar Mensaje
                        <Send className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
    )
}
