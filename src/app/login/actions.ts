'use server'

import { createClient } from '@/utils/supabase/server'

export async function sendOtp(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
        },
    })

    if (error) {
        console.error('Error enviando OTP:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function verifyOtp(email: string, token: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })

    if (error) {
        console.error('Error verificando OTP:', error)
        return { success: false, error: 'Código inválido o expirado' }
    }

    return { success: true }
}