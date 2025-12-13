import { cookies } from 'next/headers'

export async function isKioskModeActive(tenantId: string | null): Promise<boolean> {
    if (!tenantId) return false

    const cookieStore = await cookies()
    const kioskCookie = cookieStore.get('agendabarber_kiosk_mode')

    return kioskCookie?.value === tenantId
}
