import { z } from 'zod';

// Tenant schema (existing)
export const tenantSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    slug: z.string()
        .min(3, "El slug debe tener al menos 3 caracteres.")
        .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones."),
    logo: z.any()
});

export type TenantSchema = z.infer<typeof tenantSchema>;

// POS: Finalize Ticket Schema
export const finalizeTicketSchema = z.object({
    bookingId: z.string().uuid("ID de reserva inválido"),
    amount: z.number().min(0, "El monto no puede ser negativo"),
    serviceId: z.string().uuid("ID de servicio inválido"),
    paymentMethod: z.enum(["cash", "card", "transfer"]),
    tenantId: z.string().uuid("ID de negocio inválido"),
    pointsRedeemed: z.number().min(0).optional().default(0),
    rewardId: z.string().uuid().nullable().optional()
});

export type FinalizeTicketInput = z.infer<typeof finalizeTicketSchema>;

// Booking: Create Booking Schema
export const createBookingSchema = z.object({
    tenant_id: z.string().uuid("ID de negocio inválido"),
    service_id: z.string().uuid("ID de servicio inválido"),
    staff_id: z.string().uuid("ID de barbero inválido"),
    start_time: z.string().min(1, "Hora de inicio requerida"),
    client_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    client_phone: z.string().min(10, "Teléfono inválido"),
    client_email: z.string().email("Email inválido"),
    duration_min: z.number().min(15, "Duración mínima 15 minutos").max(240, "Duración máxima 4 horas"),
    customer_id: z.string().uuid().nullable().optional()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
