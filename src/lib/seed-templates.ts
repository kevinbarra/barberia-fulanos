export type SeedTemplate = {
    categories: string[];
    services: {
        category: string;
        name: string;
        price: number;
        duration_min: number;
        slug: string;
        metadata?: {
            note?: string;
            [key: string]: any;
        };
    }[];
    staff: {
        name: string;
        role: 'staff' | 'owner';
        specialties: string[]; // which categories they perform
    }[];
};

export const SEED_TEMPLATES: Record<string, SeedTemplate> = {
    barbershop: {
        categories: ["Cortes", "Barba", "Paquetes"],
        services: [
            { category: "Cortes", name: "Corte Clásico", price: 200, duration_min: 30, slug: "corte-clasico" },
            { category: "Cortes", name: "Fade / Degradado", price: 250, duration_min: 45, slug: "fade-degradado" },
            { category: "Cortes", name: "Corte Niño", price: 150, duration_min: 30, slug: "corte-nino" },
            { category: "Barba", name: "Alineamiento y Perfilado", price: 100, duration_min: 15, slug: "alineamiento-perfilado" },
            { category: "Barba", name: "Toalla Caliente & Navaja", price: 200, duration_min: 30, slug: "barba-tradicional" },
            { category: "Paquetes", name: "Corte + Barba VIP", price: 400, duration_min: 60, slug: "paquete-vip" },
        ],
        staff: [
            { name: "Carlos", role: "owner", specialties: ["Cortes", "Barba", "Paquetes"] },
            { name: "Miguel", role: "staff", specialties: ["Cortes", "Barba"] },
            { name: "Andrés", role: "staff", specialties: ["Cortes"] },
        ]
    },
    salon: {
        categories: ["Colorimetría", "Corte y Peinado", "Tratamientos", "Manos y Pies"],
        services: [
            // Colorimetría
            { category: "Colorimetría", name: "Balayage Premium", price: 2800, duration_min: 180, slug: "balayage-premium" },
            { category: "Colorimetría", name: "Tinte Global", price: 1200, duration_min: 120, slug: "tinte-global", metadata: { note: "Precio sujeto a diagnóstico" } },
            { category: "Colorimetría", name: "Retoque de Raíz", price: 750, duration_min: 90, slug: "retoque-raiz" },
            { category: "Colorimetría", name: "Matiz y Brillo", price: 550, duration_min: 45, slug: "matiz-brillo" },

            // Corte y Peinado
            { category: "Corte y Peinado", name: "Corte Dama (Estilizado)", price: 450, duration_min: 60, slug: "corte-dama-premium" },
            { category: "Corte y Peinado", name: "Peinado de Gala / Novia", price: 1200, duration_min: 90, slug: "peinado-gala" },
            { category: "Corte y Peinado", name: "Secado y Planchado", price: 350, duration_min: 45, slug: "secado-planchado" },
            { category: "Corte y Peinado", name: "Corte Caballero Moderno", price: 280, duration_min: 30, slug: "corte-caballero-salon" },

            // Tratamientos
            { category: "Tratamientos", name: "Keratina Brasileña", price: 2200, duration_min: 150, slug: "keratina-brasil" },
            { category: "Tratamientos", name: "Hidratación Profunda", price: 650, duration_min: 60, slug: "hidratacion-profunda" },
            { category: "Tratamientos", name: "Botox Capilar", price: 1500, duration_min: 120, slug: "botox-capilar" },
            { category: "Tratamientos", name: "Tratamiento de Argán", price: 400, duration_min: 30, slug: "argan-treatment" },

            // Manos y Pies
            { category: "Manos y Pies", name: "Gelish 1 Tono (Mano)", price: 350, duration_min: 60, slug: "gelish-manos" },
            { category: "Manos y Pies", name: "Manicura Express", price: 250, duration_min: 30, slug: "manicura-express" },
            { category: "Manos y Pies", name: "Pedicura Spa Premium", price: 550, duration_min: 75, slug: "pedicura-spa-premium" },
            { category: "Manos y Pies", name: "Retiro de Gel", price: 100, duration_min: 20, slug: "retiro-gel" },
        ],
        staff: [
            { name: "Sofía - Master Colorist", role: "owner", specialties: ["Colorimetría", "Corte y Peinado", "Tratamientos"] },
            { name: "Elena - Estilista Senior", role: "staff", specialties: ["Corte y Peinado", "Tratamientos", "Colorimetría"] },
            { name: "Lucía - Nail Artist", role: "staff", specialties: ["Manos y Pies"] },
            { name: "Daniela - Especialista Capilar", role: "staff", specialties: ["Tratamientos", "Corte y Peinado"] },
        ]
    },
    nails: {
        categories: ["Manicura", "Pedicura", "Acrílico & Gel"],
        services: [
            { category: "Manicura", name: "Manicura Spa", price: 200, duration_min: 45, slug: "manicura-spa" },
            { category: "Manicura", name: "Gelish 1 Tono", price: 300, duration_min: 60, slug: "gelish-1-tono" },
            { category: "Pedicura", name: "Pedicura Spa", price: 350, duration_min: 60, slug: "pedicura-spa" },
            { category: "Pedicura", name: "Pedicura + Gelish", price: 500, duration_min: 90, slug: "pedi-gelish" },
            { category: "Acrílico & Gel", name: "Acrílico Básico", price: 450, duration_min: 90, slug: "acrilico-basico" },
            { category: "Acrílico & Gel", name: "Acrílico Diseño Completo", price: 650, duration_min: 120, slug: "acrilico-diseno" },
        ],
        staff: [
            { name: "Laura", role: "owner", specialties: ["Manicura", "Pedicura", "Acrílico & Gel"] },
            { name: "Karla", role: "staff", specialties: ["Manicura", "Pedicura", "Acrílico & Gel"] },
            { name: "Diana", role: "staff", specialties: ["Manicura", "Pedicura"] },
        ]
    },
    skincare: {
        categories: ["Faciales", "Masajes", "Depilación"],
        services: [
            { category: "Faciales", name: "Limpieza Profunda", price: 600, duration_min: 60, slug: "limpieza-profunda" },
            { category: "Faciales", name: "Facial Hidratante", price: 450, duration_min: 45, slug: "facial-hidratante" },
            { category: "Masajes", name: "Masaje Relajante", price: 800, duration_min: 60, slug: "masaje-relajante" },
            { category: "Masajes", name: "Masaje Descontracturante", price: 950, duration_min: 60, slug: "masaje-descontracturante" },
            { category: "Depilación", name: "Depilación Ceja y Bozo", price: 250, duration_min: 20, slug: "depilacion-rostro" },
            { category: "Depilación", name: "Pierna Completa", price: 400, duration_min: 40, slug: "depilacion-pierna" },
        ],
        staff: [
            { name: "Valeria", role: "owner", specialties: ["Faciales", "Masajes", "Depilación"] },
            { name: "Andrea", role: "staff", specialties: ["Faciales", "Depilación"] },
            { name: "Mariana", role: "staff", specialties: ["Masajes"] },
        ]
    }
};
