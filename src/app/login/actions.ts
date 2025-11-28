'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string

    // Enviar Magic Link con los datos de TU barbería
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
            data: {
                // Tu ID real de Barbería Fulanos:
                tenant_id: 'eed81835-8498-49b2-8095-21d56fe7b5c6',
                role: 'owner', // Te estamos registrando como DUEÑO
                full_name: 'Manuel Admin'
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