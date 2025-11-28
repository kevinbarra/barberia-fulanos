import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code"; // Componente para dibujar el QR

export default async function ClientAppPage() {
    const supabase = await createClient();

    // 1. Verificar sesión del cliente
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Si no está logueado, lo mandamos al login
        // OJO: Deberíamos tener un login separado para clientes, 
        // pero por ahora usamos el mismo.
        return redirect("/login");
    }

    // 2. Obtener datos del perfil (Puntos)
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // 3. Obtener historial de visitas (citas completadas)
    const { data: history } = await supabase
        .from("bookings")
        .select("*, services(name)")
        .eq("status", "completed") // Solo las pagadas
        // Aquí hay un detalle: en bookings no guardamos client_id (usuario), guardamos customer_id.
        // Como tu sistema actual es "Guest Checkout", las citas viejas NO están ligadas a este usuario.
        // Este historial aparecerá vacío hasta que implementemos el escaneo del QR.
        .eq("customer_id", user.id)
        .order("start_time", { ascending: false });

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">

            {/* Fondo decorativo */}
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[50%] bg-blue-600 blur-[100px] opacity-20 pointer-events-none rounded-full"></div>

            <div className="z-10 w-full max-w-sm">

                {/* HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">Hola, {profile?.full_name?.split(" ")[0]}</h1>
                    <p className="text-gray-400 text-sm">Miembro Club Fulanos</p>
                </div>

                {/* TARJETA DE PUNTOS (EL QR) */}
                <div className="bg-white text-black p-6 rounded-3xl shadow-2xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                    <div className="flex flex-col items-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tu ID de Cliente</p>

                        <div className="bg-white p-2 rounded-xl border-2 border-dashed border-gray-200">
                            {/* EL CÓDIGO QR REAL */}
                            <QRCode
                                value={user.id} // El valor del QR es el ID del usuario
                                size={180}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>

                        <p className="mt-4 text-xs text-gray-400">Muestra este código al pagar</p>
                    </div>
                </div>

                {/* PUNTOS ACUMULADOS */}
                <div className="bg-gray-800 p-6 rounded-2xl flex items-center justify-between mb-4 border border-gray-700">
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold">Puntos Acumulados</p>
                        <h2 className="text-3xl font-black text-yellow-400">{profile?.loyalty_points || 0}</h2>
                    </div>
                    <div className="text-2xl">🏆</div>
                </div>

                {/* HISTORIAL RECIENTE */}
                <div>
                    <h3 className="text-gray-400 text-sm font-bold mb-3 uppercase">Últimas Visitas</h3>
                    <div className="space-y-2">
                        {!history || history.length === 0 ? (
                            <p className="text-gray-600 text-sm text-center py-4 italic">Aún no tienes visitas registradas con tu cuenta.</p>
                        ) : (
                            history.map((visit) => (
                                <div key={visit.id} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-700">
                                    <div>
                                        {/* @ts-ignore */}
                                        <p className="font-bold text-sm">{visit.services?.name}</p>
                                        <p className="text-xs text-gray-500">{new Date(visit.start_time).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-400/10 rounded-lg">Completado</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}