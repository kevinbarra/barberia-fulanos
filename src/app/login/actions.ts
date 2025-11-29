'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// 1. Enviar el Código OTP
export async function sendOtp(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            // shouldCreateUser: true asegura que si es nuevo, se registre.
            shouldCreateUser: true,
        },
    })

    if (error) {
        console.error('Error enviando OTP:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// 2. Verificar el Código OTP
export async function verifyOtp(email: string, token: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })

    if (error) {
        console.error('Error verificando OTP:', error)
        return { success: false, error: 'Código inválido o expirado' }
    }

    // Validación extra: Verificar que el usuario tenga un tenant_id asignado
    // Si no tiene perfil aún (usuario nuevo), el trigger de DB lo creará,
    // pero aquí podríamos redirigir a un onboarding si fuera necesario.

    // Si todo sale bien, la sesión se crea en el servidor automáticamente.
    return { success: true }
}