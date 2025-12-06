export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface LoyaltyTierInfo {
    name: string;
    color: string;
    gradient: string;
    icon: string;
    minPoints: number;
    maxPoints: number | null;
    multiplier: number;
    benefits: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTier, LoyaltyTierInfo> = {
    bronze: {
        name: 'Bronce',
        color: 'text-amber-700',
        gradient: 'from-amber-600 to-amber-800',
        icon: '🥉',
        minPoints: 0,
        maxPoints: 499,
        multiplier: 1.0,
        benefits: ['1 punto por cada $1 gastado', 'Canjea 100 puntos por $10 de descuento']
    },
    silver: {
        name: 'Plata',
        color: 'text-slate-400',
        gradient: 'from-slate-400 to-slate-600',
        icon: '🥈',
        minPoints: 500,
        maxPoints: 999,
        multiplier: 1.5,
        benefits: ['1.5 puntos por cada $1 gastado', 'Canjea 100 puntos por $10 de descuento', 'Prioridad en reservaciones']
    },
    gold: {
        name: 'Oro',
        color: 'text-yellow-500',
        gradient: 'from-yellow-400 to-yellow-600',
        icon: '🥇',
        minPoints: 1000,
        maxPoints: null,
        multiplier: 2.0,
        benefits: ['2 puntos por cada $1 gastado', 'Canjea 100 puntos por $10 de descuento', 'Prioridad máxima', 'Regalos exclusivos']
    }
};

export function getTierFromPoints(points: number): LoyaltyTier {
    if (points >= 1000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
}

export function getPointsToNextTier(points: number): number | null {
    if (points < 500) return 500 - points;
    if (points < 1000) return 1000 - points;
    return null;
}

export function calculatePointsDiscount(points: number): number {
    return (points / 100) * 10;
}

export function calculateMaxRedeemablePoints(points: number, totalAmount: number): number {
    const maxPointsForAmount = Math.floor((totalAmount / 10) * 100);
    return Math.min(points, maxPointsForAmount);
}