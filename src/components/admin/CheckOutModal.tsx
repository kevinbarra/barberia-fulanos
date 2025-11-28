"use client";

import { useState } from "react";
import { processPayment } from "@/app/admin/bookings/actions";

type Booking = {
    id: string;
    service_name: string;
    price: number;
    client_name: string;
};

export default function CheckOutModal({
    booking,
    onClose,
}: {
    booking: Booking;
    onClose: () => void;
}) {
    const [amount, setAmount] = useState(booking.price);
    const [method, setMethod] = useState("cash");
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        setIsProcessing(true);
        const result = await processPayment({
            booking_id: booking.id,
            amount: Number(amount),
            payment_method: method,
        });
        setIsProcessing(false);

        if (result.success) {
            alert("✅ Cobro registrado");
            window.location.reload();
        } else {
            alert("❌ Error: " + result.error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            {/* QUITAMOS overflow-hidden y flex-col para evitar cortes */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">

                {/* HEADER */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-bold text-lg">Cobrar Cita</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black font-bold p-2">✕</button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">Cliente: {booking.client_name}</p>
                        <h2 className="text-2xl font-black text-gray-900 mt-1">{booking.service_name}</h2>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total a cobrar</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-3 text-3xl font-bold border border-gray-300 rounded-xl focus:ring-black focus:border-black"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Método de pago</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['cash', 'card', 'transfer'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMethod(m)}
                                    className={`py-3 rounded-xl text-sm font-medium border capitalize transition-all ${method === m
                                        ? "bg-black text-white border-black ring-2 ring-black ring-offset-1"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                        }`}
                                >
                                    {m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transf.'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FOOTER - USAMOS BG-BLACK para asegurar visibilidad */}
                <div className="p-6 pt-0 pb-6">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        style={{ backgroundColor: 'black', color: 'white' }} // Estilo forzado por si Tailwind falla
                        className="w-full py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex justify-center items-center shadow-lg"
                    >
                        {isProcessing ? "Procesando..." : `Cobrar $${amount}`}
                    </button>
                </div>

            </div>
        </div>
    );
}