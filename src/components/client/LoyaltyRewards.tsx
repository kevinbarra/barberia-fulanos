'use client';

import { Gift, Lock, Sparkles, TrendingUp } from 'lucide-react';
import { LoyaltyReward } from '@/types/loyalty';

interface LoyaltyRewardsProps {
    currentPoints: number;
    rewards: LoyaltyReward[];
}

export default function LoyaltyRewards({ currentPoints, rewards }: LoyaltyRewardsProps) {
    // Encontrar la próxima recompensa
    const nextReward = rewards.find(r => !r.can_redeem);

    // Calcular progreso hacia la próxima recompensa
    // Calcular progreso hacia la próxima recompensa
    const getProgress = () => {
        if (!nextReward) return 100;

        const previousReward = rewards.find(r =>
            r.points_required < nextReward.points_required && r.can_redeem
        );

        const basePoints = previousReward ? previousReward.points_required : 0;
        const progressPoints = currentPoints - basePoints;
        const totalNeeded = nextReward.points_required - basePoints;

        return Math.min(Math.max((progressPoints / totalNeeded) * 100, 0), 100);
    };

    const progress = getProgress();

    return (
        <div className="space-y-6">
            {/* Header con puntos actuales */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Mis Puntos</h2>
                    </div>
                    <Gift className="w-8 h-8 opacity-80" />
                </div>

                <div className="text-5xl font-bold mb-2">
                    {currentPoints.toLocaleString()}
                </div>

                <p className="text-purple-100 text-sm">
                    puntos acumulados
                </p>
            </div>

            {/* Progreso hacia próxima recompensa */}
            {nextReward && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Próxima Recompensa</h3>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">{nextReward.reward_name}</span>
                            <span className="text-purple-600 font-bold">
                                {nextReward.points_needed} pts más
                            </span>
                        </div>

                        {/* Barra de progreso mejorada */}
                        <div className="space-y-1">
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden relative">
                                <div
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Etiquetas de rango */}
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>
                                    {(() => {
                                        const previousReward = rewards.find(r =>
                                            r.points_required < nextReward.points_required && r.can_redeem
                                        );
                                        return previousReward ? previousReward.points_required : 0;
                                    })()}
                                </span>
                                <span className="font-semibold text-purple-600">
                                    {currentPoints} pts ({Math.round(progress)}%)
                                </span>
                                <span>{nextReward.points_required}</span>
                            </div>
                        </div>

                        {/* Mensaje más claro */}
                        <p className="text-sm text-gray-600 mt-3">
                            Te faltan <strong className="text-purple-600">{nextReward.points_needed} puntos</strong> para
                            alcanzar {nextReward.reward_name.toLowerCase()}
                        </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-800">
                        {nextReward.reward_description}
                    </div>
                </div>
            )}

            {/* Lista de recompensas */}
            <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900 px-1">
                    Recompensas Disponibles
                </h3>

                {rewards.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                            No hay recompensas configuradas aún
                        </p>
                    </div>
                ) : (
                    rewards.map((reward) => (
                        <div
                            key={reward.reward_id}
                            className={`
                rounded-xl p-4 border-2 transition-all
                ${reward.can_redeem
                                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                }
              `}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {reward.can_redeem ? (
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                <Gift className="w-4 h-4 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-500" />
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="font-bold text-gray-900">
                                                {reward.reward_name}
                                            </h4>
                                            <p className="text-xs text-gray-600">
                                                {reward.service_name} - ${reward.service_price}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 ml-10">
                                        {reward.reward_description}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className={`
                    text-lg font-bold
                    ${reward.can_redeem ? 'text-green-600' : 'text-gray-400'}
                  `}>
                                        {reward.points_required}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        puntos
                                    </div>

                                    {!reward.can_redeem && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            Faltan {reward.points_needed}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {reward.can_redeem && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                    <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Disponible para canjear en tu próxima visita
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Mensaje informativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Ganas 1 punto por cada $1 que gastas.
                    Presenta tu código QR al pagar para acumular puntos automáticamente.
                </p>
            </div>
        </div>
    );
}
