export interface LoyaltyReward {
    reward_id: string;
    points_required: number;
    service_name: string;
    service_price: number;
    reward_name: string;
    reward_description: string;
    can_redeem: boolean;
    points_needed: number;
}

export interface ClientLoyaltyStatus {
    current_points: number;
    available_rewards: LoyaltyReward[];
    next_reward?: LoyaltyReward;
    progress_to_next?: number; // Porcentaje 0-100
}

export function getNextReward(rewards: LoyaltyReward[], currentPoints: number): LoyaltyReward | undefined {
    return rewards.find(r => !r.can_redeem);
}

export function getProgressToNextReward(rewards: LoyaltyReward[], currentPoints: number): number {
    const nextReward = getNextReward(rewards, currentPoints);
    if (!nextReward) return 100; // Ya alcanzó todas las recompensas

    const previousReward = rewards.find(r =>
        r.points_required < nextReward.points_required && r.can_redeem
    );

    const basePoints = previousReward ? previousReward.points_required : 0;
    const targetPoints = nextReward.points_required;
    const progressPoints = currentPoints - basePoints;
    const totalNeeded = targetPoints - basePoints;

    return Math.min(Math.max((progressPoints / totalNeeded) * 100, 0), 100);
}

// Helper functions for PointsRedemption logic (100 points = $10 MXN)
export function calculatePointsDiscount(points: number): number {
    return (points / 100) * 10;
}

export function calculateMaxRedeemablePoints(clientPoints: number, totalAmount: number): number {
    const maxPointsForTotal = Math.floor(totalAmount * 10);
    return Math.min(clientPoints, maxPointsForTotal);
}