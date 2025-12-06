'use client';

import { useState, useEffect } from 'react';
import { Gift, Coins, Info } from 'lucide-react';
import { calculatePointsDiscount, calculateMaxRedeemablePoints } from '@/types/loyalty';

interface PointsRedemptionProps {
    clientPoints: number;
    totalAmount: number;
    onPointsChange: (points: number) => void;
}

export default function PointsRedemption({
    clientPoints,
    totalAmount,
    onPointsChange
}: PointsRedemptionProps) {
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const maxRedeemable = calculateMaxRedeemablePoints(clientPoints, totalAmount);
    const discount = calculatePointsDiscount(pointsToRedeem);

    useEffect(() => {
        onPointsChange(pointsToRedeem);
    }, [pointsToRedeem, onPointsChange]);

    const handleQuickSelect = (percentage: number) => {
        const points = Math.floor(maxRedeemable * (percentage / 100));
        setPointsToRedeem(points);
    };

    if (clientPoints < 100) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800">
                    <Info className="w-5 h-5" />
                    <p className="text-sm">
                        El cliente tiene {clientPoints} puntos. Se necesitan al menos 100 puntos para canjear.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Gift className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-lg">Canjear Puntos</h3>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Puntos disponibles</p>
                    <p className="text-2xl font-bold text-purple-600 flex items-center gap-1">
                        <Coins className="w-5 h-5" />
                        {clientPoints.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Puntos a canjear</label>
                    <span className="text-sm text-gray-600">
                        Máximo: {maxRedeemable.toLocaleString()}
                    </span>
                </div>

                <input
                    type="range"
                    min="0"
                    max={maxRedeemable}
                    step="100"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />

                <div className="flex items-center justify-between">
                    <input
                        type="number"
                        min="0"
                        max={maxRedeemable}
                        step="100"
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value), maxRedeemable))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Descuento</p>
                        <p className="text-xl font-bold text-green-600">
                            -${discount.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => handleQuickSelect(25)}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                    25%
                </button>
                <button
                    onClick={() => handleQuickSelect(50)}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                    50%
                </button>
                <button
                    onClick={() => handleQuickSelect(75)}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                    75%
                </button>
                <button
                    onClick={() => handleQuickSelect(100)}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                    Máx
                </button>
            </div>

            <div className="bg-white rounded-lg p-3 text-sm text-gray-600">
                <p className="flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    100 puntos = $10 MXN de descuento
                </p>
            </div>
        </div>
    );
}