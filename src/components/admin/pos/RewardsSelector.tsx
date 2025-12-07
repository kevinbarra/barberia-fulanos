'use client';

import { useState, useEffect } from 'react';
import { Gift, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { LoyaltyReward } from '@/types/loyalty';

interface RewardsSelectorProps {
    clientId: string;
    tenantId: string;
    currentPoints: number;
    availableRewards: LoyaltyReward[];
    onRewardSelect: (rewardId: string | null, pointsToRedeem: number) => void;
}

export default function RewardsSelector({
    clientId,
    tenantId,
    currentPoints,
    availableRewards,
    onRewardSelect
}: RewardsSelectorProps) {
    const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

    // Filtrar solo recompensas que el cliente puede canjear
    const redeemableRewards = availableRewards.filter(r => r.can_redeem);

    const handleRewardChange = (rewardId: string | null) => {
        setSelectedRewardId(rewardId);

        if (rewardId) {
            const reward = availableRewards.find(r => r.reward_id === rewardId);
            if (reward) {
                onRewardSelect(rewardId, reward.points_required);
            }
        } else {
            onRewardSelect(null, 0);
        }
    };

    useEffect(() => {
        // Reset cuando cambian las recompensas disponibles
        setSelectedRewardId(null);
        onRewardSelect(null, 0);
    }, [clientId]);

    if (currentPoints === 0) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                    <Gift className="w-5 h-5" />
                    <p className="text-sm">
                        El cliente aún no tiene puntos acumulados.
                    </p>
                </div>
            </div>
        );
    }

    if (redeemableRewards.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">
                            El cliente tiene {currentPoints} puntos
                        </p>
                        <p className="text-xs text-amber-700">
                            Se necesitan al menos {availableRewards[0]?.points_required || 500} puntos para canjear una recompensa.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Gift className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-lg">Canjear Recompensa</h3>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Puntos disponibles</p>
                    <p className="text-2xl font-bold text-purple-600 flex items-center gap-1">
                        <Sparkles className="w-5 h-5" />
                        {currentPoints.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {/* Opción: No canjear */}
                <label
                    className={`
            flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
            ${selectedRewardId === null
                            ? 'bg-white border-purple-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }
          `}
                >
                    <input
                        type="radio"
                        name="reward"
                        checked={selectedRewardId === null}
                        onChange={() => handleRewardChange(null)}
                        className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            No canjear puntos
                        </div>
                        <div className="text-sm text-gray-600">
                            El cliente acumulará puntos por esta compra
                        </div>
                    </div>
                </label>

                {/* Lista de recompensas disponibles */}
                {redeemableRewards.map((reward) => (
                    <label
                        key={reward.reward_id}
                        className={`
              flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
              ${selectedRewardId === reward.reward_id
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500 shadow-md'
                                : 'bg-white border-gray-200 hover:border-green-300'
                            }
            `}
                    >
                        <input
                            type="radio"
                            name="reward"
                            value={reward.reward_id}
                            checked={selectedRewardId === reward.reward_id}
                            onChange={(e) => handleRewardChange(e.target.value)}
                            className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500"
                        />

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="font-bold text-gray-900">
                                    {reward.reward_name}
                                </span>
                            </div>

                            <div className="text-sm text-gray-700 mb-2">
                                {reward.service_name} - Valor: ${reward.service_price}
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">
                                    {reward.reward_description}
                                </span>
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                                    {reward.points_required} pts
                                </span>
                            </div>
                        </div>
                    </label>
                ))}
            </div>

            {selectedRewardId && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                            <p className="font-semibold mb-1">Recompensa seleccionada</p>
                            <p>
                                Se descontarán {redeemableRewards.find(r => r.reward_id === selectedRewardId)?.points_required} puntos.
                                El servicio será GRATIS para el cliente.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
                <p className="flex items-center gap-1">
                    <Gift className="w-4 h-4" />
                    El cliente seguirá acumulando 1 punto por cada $1 que pague en efectivo en esta compra.
                </p>
            </div>
        </div>
    );
}
