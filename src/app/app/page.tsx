import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Settings, User, Calendar, Clock, MapPin, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";

export default async function ClientAppPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // 1. Perfil del Usuario
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // 2. PRÓXIMA CITA (Futuro)
    const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select(`
            *,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .gte("start_time", new Date().toISOString()) // Solo futuro
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(1);

    const nextBooking = upcomingBookings?.[0];

    // 3. Historial (Pasado)
    const { data: history } = await supabase
        .from("transactions")
        .select("amount, created_at, points_earned, services(name)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    const points = profile?.loyalty_points || 0;
    const GOAL = 100;
    const progress = Math.min((points / GOAL) * 100, 100);
    const nextReward = GOAL - (points % GOAL);

    // Helpers de fecha
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    };
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32 relative overflow-hidden selection:bg-blue-500/30">
            {/* Fondos Ambientales */}
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
                                <Image
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-6 h-6 text-zinc-500" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-zinc-800 p-1 rounded-full border border-black">
                            <Settings size={10} className="text-white" />
                        </div>
                    </Link>
                </div>

                {/* TARJETA PRÓXIMA CITA (Hero Section) */}
                <div className="mb-8">
                    <div className="flex justify-between items-baseline mb-3">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Tu Próxima Cita</h2>
                        {nextBooking && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium border border-green-500/20">Confirmada</span>
                        )}
                    </div>

                    {nextBooking ? (
                        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-1 shadow-2xl border border-zinc-700/50">
                            <div className="bg-zinc-900/90 rounded-[22px] p-5 relative overflow-hidden backdrop-blur-sm">
                                {/* Decoración de fondo */}
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <h3 className="text-2xl font-bold text-white mb-1">{(nextBooking.services as any)?.name}</h3>
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                                                {(nextBooking.profiles as any)?.avatar_url ? (
                                                    <Image src={(nextBooking.profiles as any).avatar_url} alt="Staff" width={20} height={20} className="object-cover" />
                                                ) : <User size={12} />}
                                            </div>
                                            <span>con {(nextBooking.profiles as any)?.full_name?.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-white/10 p-2 rounded-xl text-center min-w-[60px]">
                                            <span className="block text-xs text-zinc-400 uppercase font-bold">Hora</span>
                                            <span className="block text-lg font-bold text-white">{formatTime(nextBooking.start_time)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-4">
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Calendar size={16} className="text-blue-500" />
                                        <span className="capitalize">{formatDate(nextBooking.start_time)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <MapPin size={16} className="text-purple-500" />
                                        <span>Sucursal Centro</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // ESTADO VACÍO (Call to Action)
                        <Link href="/book/fulanos" className="block group">
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

                {/* WALLET / PUNTOS */}
                <div className="bg-zinc-900 rounded-[28px] p-6 mb-8 relative overflow-hidden border border-zinc-800 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Mi Saldo</p>
                            <h3 className="text-3xl font-black text-white">{points} <span className="text-lg font-medium text-zinc-500">pts</span></h3>
                        </div>
                        <div className="bg-white p-2 rounded-xl">
                            <QRCode
                                value={user.id}
                                size={48}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] mb-2 font-bold uppercase tracking-wider">
                            <span className="text-zinc-500">Nivel Bronce</span>
                            <span className="text-blue-400">Meta: {GOAL} pts</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-right text-[10px] text-zinc-500 mt-2">
                            +{nextReward} pts para recompensa
                        </p>
                    </div>
                </div>

                {/* HISTORIAL */}
                <div className="flex-1">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Historial</h3>
                    <div className="space-y-3">
                        {!history || history.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-zinc-600 text-sm">Tu historial aparecerá aquí.</p>
                            </div>
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
                                            <p className="text-[10px] text-zinc-500 uppercase">
                                                {new Date(tx.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-green-500 font-bold text-xs">+{tx.points_earned} pts</span>
                                        <span className="text-[10px] text-zinc-600">${tx.amount}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}