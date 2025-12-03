import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Settings, User } from "lucide-react";
import Image from "next/image";

export default async function ClientAppPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden selection:bg-blue-500/30">
            <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-20%] w-[250px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 max-w-sm mx-auto flex flex-col min-h-[90vh]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-xl font-bold">Hola, {profile?.full_name?.split(" ")[0]}</h1>
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

                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-1 rounded-[32px] shadow-2xl mb-8 border border-zinc-700/50">
                    <div className="bg-zinc-900 rounded-[28px] p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="bg-white p-3 rounded-2xl shadow-inner">
                                <QRCode
                                    value={user.id}
                                    size={160}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-4 uppercase tracking-widest font-bold">Tu ID de Miembro</p>
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between text-xs mb-2 font-medium">
                                <span className="text-zinc-300">Nivel Actual</span>
                                <span className="text-blue-400">{points} pts</span>
                            </div>
                            <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-1000 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-right text-[10px] text-zinc-500 mt-2">
                                Faltan {nextReward} pts para tu recompensa
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Actividad Reciente</h3>
                    <div className="space-y-3">
                        {!history || history.length === 0 ? (
                            <div className="text-center py-10 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 border-dashed">
                                <p className="text-zinc-600 text-sm">Aún no tienes visitas registradas.</p>
                            </div>
                        ) : (
                            history.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/80 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <span className="text-lg">✂️</span>
                                        </div>
                                        <div>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            <p className="font-bold text-sm text-zinc-200">{(tx.services as any)?.name || 'Servicio'}</p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(tx.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-green-400 font-bold text-sm">+{tx.points_earned} pts</span>
                                        <span className="text-xs text-zinc-600">${tx.amount}</span>
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