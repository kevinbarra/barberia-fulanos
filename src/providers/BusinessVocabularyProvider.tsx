'use client'

import React, { createContext, useContext, useMemo } from 'react'

export type BusinessType = 'barber' | 'salon' | 'spa' | 'nails' | 'default'

interface Vocabulary {
    staff_singular: string
    staff_plural: string
    service_singular: string
    service_plural: string
    agenda_label: string
    welcome_message: string
}

const vocabularies: Record<BusinessType, Vocabulary> = {
    barber: {
        staff_singular: 'Barbero',
        staff_plural: 'Barberos',
        service_singular: 'Corte',
        service_plural: 'Cortes',
        agenda_label: 'Agenda del Barbero',
        welcome_message: 'Bienvenido a la Barbería'
    },
    salon: {
        staff_singular: 'Estilista',
        staff_plural: 'Estilistas',
        service_singular: 'Servicio',
        service_plural: 'Servicios',
        agenda_label: 'Agenda del Estilista',
        welcome_message: 'Bienvenido al Salón'
    },
    spa: {
        staff_singular: 'Terapeuta',
        staff_plural: 'Terapeutas',
        service_singular: 'Tratamiento',
        service_plural: 'Tratamientos',
        agenda_label: 'Agenda de Cabina',
        welcome_message: 'Bienvenido al Spa'
    },
    nails: {
        staff_singular: 'Manicurista',
        staff_plural: 'Manicuristas',
        service_singular: 'Servicio',
        service_plural: 'Servicios',
        agenda_label: 'Agenda de Mesa',
        welcome_message: 'Bienvenido'
    },
    default: {
        staff_singular: 'Personal',
        staff_plural: 'Personal',
        service_singular: 'Servicio',
        service_plural: 'Servicios',
        agenda_label: 'Agenda',
        welcome_message: 'Bienvenido'
    }
}

interface VocabularyContextType {
    vocabulary: Vocabulary
    businessType: BusinessType
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined)

export function BusinessVocabularyProvider({ 
    children, 
    businessType = 'barber' 
}: { 
    children: React.ReactNode
    businessType?: BusinessType 
}) {
    const value = useMemo(() => ({
        vocabulary: vocabularies[businessType] || vocabularies.default,
        businessType
    }), [businessType])

    return (
        <VocabularyContext.Provider value={value}>
            {children}
        </VocabularyContext.Provider>
    )
}

export function useVocabulary() {
    const context = useContext(VocabularyContext)
    if (context === undefined) {
        // Fallback to barber if not in provider, to avoid crashes
        return {
            vocabulary: vocabularies.barber,
            businessType: 'barber' as BusinessType
        }
    }
    return context
}
