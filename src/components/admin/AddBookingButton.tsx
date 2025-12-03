"use client";

import { useState } from "react";
import NewBookingModal from "./NewBookingModal";

type Service = { id: string; name: string; duration_min: number };
type Staff = { id: string; full_name: string };

export default function AddBookingButton({
    tenantId,
    services,
    staff
}: {
    tenantId: string,
    services: Service[],
    staff: Staff[]
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-300 flex items-center justify-center text-3xl font-light hover:bg-blue-700 hover:scale-105 transition-all z-40 active:scale-90"
                title="Nueva Cita Rápida"
            >
                +
            </button>

            {isOpen && (
                <NewBookingModal
                    tenantId={tenantId}
                    services={services}
                    staff={staff}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}