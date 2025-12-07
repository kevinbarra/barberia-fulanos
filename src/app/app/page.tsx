import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Settings, User, Plus } from "lucide-react";
import Image from "next/image";
import LoyaltyRewards from '@/components/client/LoyaltyRewards';
import { getMyLoyaltyStatus } from './loyalty-actions';
import NextAppointmentCard from "@/components/client/NextAppointmentCard";

export default async function ClientAppPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Consultar Próxima Cita Activa
    const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, status,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(1);

    const nextBooking = upcomingBookings?.[0];

    const { data: history } = await supabase
        .from("transactions")
        .select("amount, created_at, points_earned, services(name)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // Cargar estado de lealtad
    const loyaltyStatus = await getMyLoyaltyStatus();

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32 relative overflow-hidden selection:bg-blue-500/30">

            <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-20%] w-[250px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 max-w-sm mx-auto flex flex-col min-h-[90vh]">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-xl font-bold capitalize">Hola, {profile?.full_name?.split(" ")[0] || 'Cliente'}</h1>
                        <p className="text-zinc-500 text-xs">Bienvenido a Fulanos</p>
                    </div>
                    <Link href="/app/profile" className="relative group">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-800 group-hover:border-white transition-colors bg-zinc-900 flex items-center justify-center">
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Avatar" width={48} height={48} className="object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-zinc-500" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-zinc-800 p-1 rounded-full border border-black">
                            <Settings size={10} className="text-white" />
                        </div>
                    </Link>
                </div>

                {/* SECCIÓN PRÓXIMA CITA */}
                <div className="mb-2">
                    <div className="flex justify-between items-baseline mb-3">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Tu Próxima Cita</h2>
                        {nextBooking && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-500/20">Confirmada</span>
                        )}
                    </div>

                    {nextBooking ? (
                        // AQUÍ INSERTAMOS LA NUEVA TARJETA INTERACTIVA
                        <NextAppointmentCard booking={nextBooking} />
                    ) : (
                        <Link href="/book/fulanos" className="block group mb-8">
                            <div className="bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer group-active:scale-[0.98]">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                                    <Plus size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-zinc-300">No tienes citas próximas</p>
                                    <p className="text-xs text-zinc-500 mt-1">Reserva tu corte en segundos</p>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Sección de Lealtad */}
                <section className="mb-8">
                    {loyaltyStatus.success && loyaltyStatus.data ? (
                        <LoyaltyRewards
                            currentPoints={loyaltyStatus.data.current_points}
                            rewards={loyaltyStatus.data.available_rewards}
                        />
                    ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                No se pudo cargar tu información de recompensas.
                            </p>
                        </div>
                    )}
                </section>

                {/* HISTORIAL */}
                <div className="flex-1">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Historial</h3>
                    <div className="space-y-3">
                        {!history || history.length === 0 ? (
                            <div className="text-center py-8"><p className="text-zinc-600 text-sm">Tu historial aparecerá aquí.</p></div>
                        ) : (
                            history.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {(tx.services as any)?.name?.charAt(0) || 'S'}
                                        </div>
                                        <div>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <p className="font-bold text-sm text-zinc-300">{(tx.services as any)?.name || 'Servicio'}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase">{new Date(tx.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right"><span className="block text-green-500 font-bold text-xs">+{tx.points_earned} pts</span><span className="text-[10px] text-zinc-600">${tx.amount}</span></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}