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
            {/* Header con puntos actuales (Tarjeta de la marca) */}
            <div className="bg-gradient-to-br from-[var(--brand-color)] to-[var(--brand-color-secondary)] rounded-3xl p-6 text-white shadow-xl shadow-[var(--brand-color-40)] border border-white/10 relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute right-0 bottom-0 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-white/90" />
                        <h2 className="text-sm font-black tracking-widest uppercase text-white/90">Mis Puntos</h2>
                    </div>
                    <Gift className="w-7 h-7 text-white/80" />
                </div>

                <div className="text-5xl font-black mb-1.5 tracking-tight relative z-10">
                    {currentPoints.toLocaleString()}
                </div>

                <p className="text-white/70 text-xs font-bold uppercase tracking-wider relative z-10">
                    puntos acumulados
                </p>
            </div>

            {/* Progreso hacia próxima recompensa */}
            {nextReward && (
                <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800/80 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-[var(--brand-color)] animate-pulse" />
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Próxima Recompensa</h3>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="font-bold text-zinc-300">{nextReward.reward_name}</span>
                            <span className="text-[var(--brand-color)] font-extrabold">
                                {nextReward.points_needed} pts más
                            </span>
                        </div>

                        {/* Barra de progreso premium */}
                        <div className="space-y-2">
                            <div className="w-full bg-zinc-850 rounded-full h-3.5 overflow-hidden relative border border-zinc-800 shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color-secondary)] h-full transition-all duration-500 rounded-full shadow-lg shadow-[var(--brand-color)]/20"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Etiquetas de rango */}
                            <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                <span>
                                    {(() => {
                                        const previousReward = rewards.find(r =>
                                            r.points_required < nextReward.points_required && r.can_redeem
                                        );
                                        return previousReward ? previousReward.points_required : 0;
                                    })()}
                                </span>
                                <span className="font-black text-[var(--brand-color)]">
                                    {currentPoints} pts ({Math.round(progress)}%)
                                </span>
                                <span>{nextReward.points_required}</span>
                            </div>
                        </div>

                        {/* Mensaje más claro */}
                        <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                            Te faltan <strong className="text-[var(--brand-color)] font-bold">{nextReward.points_needed} puntos</strong> para
                            alcanzar {nextReward.reward_name.toLowerCase()}
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-zinc-400 font-medium leading-relaxed">
                        {nextReward.reward_description}
                    </div>
                </div>
            )}

            {/* Lista de recompensas */}
            <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 px-1">
                    Recompensas Disponibles
                </h3>

                {rewards.length === 0 ? (
                    <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl p-8 text-center backdrop-blur-sm">
                        <Gift className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm font-medium">
                            No hay recompensas configuradas aún
                        </p>
                    </div>
                ) : (
                    rewards.map((reward) => (
                        <div
                            key={reward.reward_id}
                            className={`
                                rounded-3xl p-4 border transition-all backdrop-blur-sm
                                ${reward.can_redeem
                                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.05)]'
                                    : 'bg-zinc-900/30 border-zinc-800/60 opacity-60'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {reward.can_redeem ? (
                                            <div className="w-8 h-8 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                <Gift className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-500">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="font-bold text-sm text-white">
                                                {reward.reward_name}
                                            </h4>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                {reward.service_name} • ${reward.service_price}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-zinc-400 ml-11 leading-relaxed">
                                        {reward.reward_description}
                                    </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <div className={`
                                        text-xl font-black tracking-tight leading-none
                                        ${reward.can_redeem ? 'text-emerald-400' : 'text-zinc-600'}
                                    `}>
                                        {reward.points_required}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-1">
                                        puntos
                                    </div>

                                    {!reward.can_redeem && (
                                        <div className="text-[9px] text-zinc-500 font-bold mt-2 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/30">
                                            Faltan {reward.points_needed}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {reward.can_redeem && (
                                <div className="mt-3 pt-3 border-t border-emerald-500/20">
                                    <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border border-emerald-500/20">
                                        <Sparkles className="w-3 h-3 text-emerald-400" />
                                        <span>Disponible para canjear en tu próxima visita</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Mensaje informativo */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 backdrop-blur-sm">
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    <strong className="text-[var(--brand-color)] font-bold">💡 Tip:</strong> Ganas 1 punto por cada $1 que gastas.
                    Presenta tu código QR al pagar para acumular puntos automáticamente.
                </p>
            </div>
        </div>
    );
}
