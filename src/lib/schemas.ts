import { z } from 'zod';

export const tenantSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    slug: z.string()
        .min(3, "El slug debe tener al menos 3 caracteres.")
        .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones."),
    logo: z.any() // Manejo de archivo separado o refinado después
});

export type TenantSchema = z.infer<typeof tenantSchema>;
