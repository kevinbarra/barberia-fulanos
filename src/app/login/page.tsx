import { login } from './actions'
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams

    // --- LÓGICA INTELIGENTE: Redirección automática ---
    // Si el usuario ya tiene sesión iniciada, no debería ver el login.
    // Lo mandamos directamente a la app.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Si ya está dentro, lo mandamos al dashboard de cliente por defecto.
        // Desde ahí podrá navegar al Admin si es staff.
        return redirect('/app');
    }
    // --------------------------------------------------

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Fondo Ambiental (Efectos de luz) */}
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
                    <p className="text-zinc-400 text-sm">
                        Ingresa tu correo para acceder a tus puntos o al panel administrativo.
                    </p>
                </div>

                {/* Alertas de Estado (Mensajes de Error o Éxito) */}
                {params.message === 'check-email' && (
                    <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                        ✅ ¡Enlace enviado! Revisa tu correo (incluyendo la carpeta de Spam).
                    </div>
                )}

                {params.error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-in zoom-in">
                        ❌ Ocurrió un error. Inténtalo de nuevo.
                    </div>
                )}

                {/* Formulario Estilo "Glassmorphism" Sutil */}
                <form className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold uppercase text-zinc-500 tracking-wider ml-1">
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                            placeholder="nombre@ejemplo.com"
                        />
                    </div>

                    <button
                        formAction={login}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-4"
                    >
                        Enviar enlace mágico ✨
                    </button>
                </form>

                <p className="text-center text-zinc-600 text-xs mt-8">
                    Sin contraseñas. Seguro y rápido.
                </p>

            </div>
        </div>
    )
}