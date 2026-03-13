import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PaymentSettings from "@/components/admin/PaymentSettings";

export default function PaymentsPage() {
    return (
        <div className="max-w-4xl mx-auto p-6 pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/settings" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Finanzas y Pagos</h1>
                    <p className="text-gray-600 text-sm">Configura reglas de pago, moneda e impuestos.</p>
                </div>
            </div>

            <PaymentSettings />
        </div>
    )
}
