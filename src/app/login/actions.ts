'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    // Lógica inteligente para saber la URL actual
    const headersList = await headers()
    const host = headersList.get('host') // Ej: barberia-fulanos.vercel.app
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const redirectUrl = `${protocol}://${host}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectUrl, // <--- AHORA ES DINÁMICO
            data: {
                tenant_id: 'eed81835-8498-49b2-8095-21d56fe7b5c6',
                role: 'owner',
                full_name: 'Kevin Admin'
            }
        },
    })

    if (error) {
        console.error('Error de Auth:', error)
        redirect('/login?error=true')
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=check-email')
}