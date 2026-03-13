import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type BusinessType = 'barber' | 'salon' | 'spa' | 'nails' | 'default';

export function getStaffLabel(businessType: BusinessType = 'barber'): string {
    switch (businessType) {
        case 'barber': return 'Barbero';
        case 'salon': return 'Estilista';
        case 'spa': return 'Terapeuta';
        case 'nails': return 'Manicurista';
        default: return 'Personal';
    }
}

export function getStaffLabelPlural(businessType: BusinessType = 'barber'): string {
    switch (businessType) {
        case 'barber': return 'Barberos';
        case 'salon': return 'Estilistas';
        case 'spa': return 'Terapeutas';
        case 'nails': return 'Manicuristas';
        default: return 'Personal';
    }
}

export function calculateRemainingBalance(total: number, paid: number): number {
    return Math.max(0, total - paid);
}
