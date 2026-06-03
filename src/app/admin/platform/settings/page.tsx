import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Settings, ShieldCheck, Mail, Calendar, Server, Database, Globe } from "lucide-react";

export default async function PlatformSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        return redirect("/admin");
    }

    // Fetch all super administrators
    const { data: superAdmins } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'super_admin')
        .order('created_at', { ascending: true });

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-zinc-950 text-zinc-100">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/60 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Settings className="text-amber-500" size={32} />
                        Configuración Global
                    </h1>
                    <p className="text-zinc-400 font-medium text-sm mt-1">
                        Control de credenciales, administradores de plataforma y estado del sistema.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Administrators list (2/3 width on desktop) */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2 backdrop-blur-md space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="text-amber-400" size={20} />
                            Administradores de Plataforma (Super Admins)
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">Usuarios autorizados para acceder al Platform Control Center y administrar barberías.</p>
                    </div>

                    <div className="divide-y divide-zinc-800/80">
                        {superAdmins?.map((admin) => (
                            <div key={admin.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 border border-zinc-700/40 uppercase">
                                        {admin.full_name ? admin.full_name[0] : 'A'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{admin.full_name || 'Sin nombre registrado'}</p>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                            <Mail size={12} /> {admin.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-bold">Fecha de Registro</span>
                                    <span className="text-xs text-zinc-300 font-medium flex items-center gap-1 mt-0.5 justify-end">
                                        <Calendar size={12} className="text-zinc-500" />
                                        {formatDate(admin.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Diagnostics (1/3 width on desktop) */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6 h-fit">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Server className="text-amber-400" size={20} />
                            Diagnóstico del Sistema
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">Estado del motor de base de datos y variables de entorno.</p>
                    </div>

                    <div className="space-y-4">
                        {/* DB status check */}
                        <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-2.5">
                                <Database className="text-emerald-400" size={16} />
                                <div>
                                    <p className="text-xs font-bold text-zinc-300">Base de Datos</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Supabase PostgreSQL</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                Conectado 🟢
                            </span>
                        </div>

                        {/* Edge Functions status */}
                        <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-2.5">
                                <Globe className="text-emerald-400" size={16} />
                                <div>
                                    <p className="text-xs font-bold text-zinc-300">Servicio de API</p>
                                    <p className="text-[10px] text-zinc-500 font-medium">Next.js Server Actions</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                Operativo 🟢
                            </span>
                        </div>

                        {/* System Metadata */}
                        <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/40 text-xs space-y-2">
                            <div className="flex justify-between text-zinc-500 font-semibold">
                                <span>Entorno:</span>
                                <span className="text-zinc-300 font-bold">Producción</span>
                            </div>
                            <div className="flex justify-between text-zinc-500 font-semibold">
                                <span>Dominio SaaS:</span>
                                <span className="text-zinc-300 font-bold">agendabarber.pro</span>
                            </div>
                            <div className="flex justify-between text-zinc-500 font-semibold">
                                <span>Versión del Panel:</span>
                                <span className="text-zinc-300 font-bold">v1.2.0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
