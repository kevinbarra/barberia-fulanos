export type SeedTemplate = {
    categories: string[];
    services: {
        category: string;
        name: string;
        price: number;
        duration_min: number;
        slug: string;
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
        categories: ["Corte y Peinado", "Coloración", "Tratamientos"],
        services: [
            { category: "Corte y Peinado", name: "Corte Dama", price: 350, duration_min: 45, slug: "corte-dama" },
            { category: "Corte y Peinado", name: "Peinado Express", price: 250, duration_min: 30, slug: "peinado-express" },
            { category: "Corte y Peinado", name: "Corte Caballero", price: 250, duration_min: 30, slug: "corte-caballero" },
            { category: "Coloración", name: "Tinte Raíz", price: 600, duration_min: 60, slug: "tinte-raiz" },
            { category: "Coloración", name: "Balayage", price: 1800, duration_min: 180, slug: "balayage" },
            { category: "Tratamientos", name: "Keratina", price: 1200, duration_min: 120, slug: "keratina" },
        ],
        staff: [
            { name: "Sofía", role: "owner", specialties: ["Corte y Peinado", "Coloración", "Tratamientos"] },
            { name: "Elena", role: "staff", specialties: ["Corte y Peinado", "Tratamientos"] },
            { name: "Daniel", role: "staff", specialties: ["Coloración"] },
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
