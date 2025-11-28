"use client";

import { useState } from "react";
import CheckOutModal from "./CheckOutModal";

// Definimos la estructura de la cita
type BookingProps = {
    id: string;
    start_time: string;
    status: string;
    notes: string | null;
    services: {
        name: string;
        price: number;
        duration_min: number;
    } | null; // Puede ser null si se borró el servicio
};

export default function BookingCard({ booking }: { booking: BookingProps }) {
    const [showModal, setShowModal] = useState(false);

    // Formatear datos para visualización
    const dateObj = new Date(booking.start_time);
    const dayName = dateObj.toLocaleDateString("es-MX", { weekday: "short" });
    const dayNum = dateObj.getDate();
    const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const serviceName = booking.services?.name || "Servicio desconocido";
    const price = booking.services?.price || 0;
    const duration = booking.services?.duration_min || 0;

    // Extraer nombre del cliente de las notas (Truco rápido)
    // Las notas son: "Cliente: Kevin | Tel: ..."
    const clientName = booking.notes?.split("|")[0]?.replace("Cliente:", "").trim() || "Anónimo";

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* COLUMNA IZQUIERDA: DATOS */}
                <div className="flex items-start gap-4">
                    <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-center min-w-[90px]">
                        <span className="block text-xs font-bold uppercase tracking-wider">{dayName}</span>
                        <span className="block text-xl font-black">{dayNum}</span>
                        <span className="block text-xs">{timeStr}</span>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{serviceName}</h3>
                        <p className="text-gray-500 text-sm mt-1">{booking.notes}</p>
                        <div className="mt-2 flex gap-2">
                            <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                {duration} min
                            </span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: ACCIONES */}
                <div className="text-right flex flex-col md:items-end gap-2 justify-between h-full">
                    <span className="text-2xl font-bold text-gray-900">${price}</span>

                    {booking.status === "completed" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                            ✅ Pagado
                        </span>
                    ) : (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 active:scale-95"
                        >
                            Cobrar 💸
                        </button>
                    )}
                </div>
            </div>

            {/* MODAL DE COBRO (Solo se renderiza si showModal es true) */}
            {showModal && (
                <CheckOutModal
                    booking={{
                        id: booking.id,
                        price: price,
                        service_name: serviceName,
                        client_name: clientName,
                    }}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}