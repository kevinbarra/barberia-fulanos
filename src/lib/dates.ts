import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from './constants';

// 🌎 Configuración Maestra: Zona Horaria del Negocio
// Si algún día tienes clientes en otros países, esto podría venir de la DB (tenant.timezone)
const TIMEZONE = DEFAULT_TIMEZONE;

export function getTodayRange() {
    const now = new Date();

    // 1. Obtener la fecha en la zona horaria del negocio
    // Esto nos da un Date que "aparenta" ser la hora local (ej: 10:00 si en CDMX son las 10:00)
    const zonedNow = toZonedTime(now, TIMEZONE);

    // 2. Calcular límites del día en HORA LOCAL (00:00:00 - 23:59:59)
    const localStart = startOfDay(zonedNow);
    const localEnd = endOfDay(zonedNow);

    // 3. Convertir esos límites locales de vuelta a UTC real para la base de datos
    // Ej: 00:00 CDMX -> 06:00 UTC
    // Ej: 23:59 CDMX -> 05:59 UTC (del día siguiente)
    const startUTC = fromZonedTime(localStart, TIMEZONE);
    const endUTC = fromZonedTime(localEnd, TIMEZONE);

    return {
        startISO: startUTC.toISOString(),
        endISO: endUTC.toISOString(),
        // Para mostrar en la UI (ej: "sábado, 29 de noviembre")
        displayDate: format(zonedNow, "EEEE, d 'de' MMMM", { timeZone: TIMEZONE })
    };
}

// Helper extra para mostrar horas limpias en las listas
export function formatTime(isoString: string) {
    return format(new Date(isoString), 'h:mm a', { timeZone: TIMEZONE });
}