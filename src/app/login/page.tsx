import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login/LoginForm";

export default async function LoginPage() {
    // --- LÓGICA INTELIGENTE: Redirección automática ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Si el usuario ya está logueado, lo sacamos del login.
    if (user) {
        // Consultamos su rol para mandarlo a la página correcta
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Si es Owner o Staff -> Admin Panel
        // Si es Customer (o null) -> App Cliente
        const isAdminOrStaff = profile?.role === 'owner' || profile?.role === 'staff';

        return redirect(isAdminOrStaff ? '/admin' : '/app');
    }
    // --------------------------------------------------

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Fondo Ambiental (Mantenido de tu versión) */}
            <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-sm z-10">

                {/* Header con Navegación */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="text-zinc-500 text-xs font-bold hover:text-white mb-6 inline-block transition-colors"
                    >
                        ← Volver al inicio
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Bienvenido</h1>
                    <p className="text-zinc-400 text-sm">Ingresa para gestionar tus citas.</p>
                </div>

                {/* FORMULARIO CLIENTE (Interactivo) */}
                <LoginForm />

                <p className="text-center text-zinc-600 text-xs mt-8">
                    Código de un solo uso. Seguro y sin contraseñas.
                </p>

            </div>
        </div>
    )
}