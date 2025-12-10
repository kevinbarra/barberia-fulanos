import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    Home,
    ShieldCheck
} from "lucide-react";
import { signOut } from "@/app/auth/actions";

export default async function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Validate Super Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        return redirect("/admin");
    }

    const platformMenu = [
        { name: 'Dashboard', href: '/admin/platform', icon: LayoutDashboard },
        { name: 'Barberías', href: '/admin/platform', icon: Building2 },
        { name: 'Reportes', href: '/admin/platform/reports', icon: BarChart3 },
        { name: 'Configuración', href: '/admin/platform/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Sidebar - Desktop */}
            <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex-col h-screen sticky top-0 hidden lg:flex">
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-white text-lg">AgendaBarber</h1>
                            <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">Control Center</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {platformMenu.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-medium"
                        >
                            <item.icon size={20} />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-white font-bold text-sm truncate">{profile?.full_name || 'Super Admin'}</p>
                        <p className="text-zinc-500 text-xs truncate">{profile?.email}</p>
                    </div>
                    <form action={signOut}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-zinc-800 rounded-xl transition-all font-medium"
                        >
                            <LogOut size={20} />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-black text-white">AgendaBarber</span>
                </div>
                <Link href="/admin" className="text-zinc-400 hover:text-white">
                    <Home size={20} />
                </Link>
            </div>

            {/* Main Content */}
            <main className="flex-1 pt-16 lg:pt-0">
                {children}
            </main>
        </div>
    );
}
