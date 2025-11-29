import { toZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

// 🌎 Configuración Maestra: Zona Horaria del Negocio
// Si algún día tienes clientes en otros países, esto podría venir de la DB (tenant.timezone)
const TIMEZONE = 'America/Mexico_City';

export function getTodayRange() {
    const now = new Date();

    // 1. Convertir la hora del servidor (UTC) a la hora local del negocio
    const zonedNow = toZonedTime(now, TIMEZONE);

    // 2. Calcular inicio y fin del día BASADO en esa hora local
    const start = startOfDay(zonedNow);
    const end = endOfDay(zonedNow);

    return {
        // Supabase espera fechas en formato ISO (UTC), así que las regresamos convertidas
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        // Para mostrar en la UI (ej: "sábado, 29 de noviembre")
        displayDate: format(zonedNow, "EEEE, d 'de' MMMM", { timeZone: TIMEZONE },)
    };
}

// Helper extra para mostrar horas limpias en las listas
export function formatTime(isoString: string) {
    return format(new Date(isoString), 'h:mm a', { timeZone: TIMEZONE });
}