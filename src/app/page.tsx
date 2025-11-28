import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between relative overflow-hidden selection:bg-blue-500 selection:text-white">

      {/* FONDO AMBIENTAL */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* NAV SUPERIOR */}
      <nav className="p-6 z-10 flex justify-between items-center">
        <div className="font-bold text-xl tracking-tight">FULANOS</div>
        <Link
          href="/admin"
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Soy Staff
        </Link>
      </nav>

      {/* CONTENIDO CENTRAL */}
      <main className="px-6 z-10 flex flex-col items-center text-center">

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
          Tu Estilo.<br />Elevado.
        </h1>

        <p className="text-zinc-400 text-lg mb-10 max-w-xs mx-auto leading-relaxed">
          Agenda tu cita en segundos o revisa tus puntos de lealtad.
        </p>

        <div className="w-full max-w-sm space-y-3">

          <Link
            href="/book/fulanos"
            className="group block w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Reservar Cita
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
          </Link>

          <Link
            href="/app"
            className="block w-full bg-zinc-900 border border-zinc-800 text-white font-medium py-4 rounded-xl hover:bg-zinc-800 transition-all active:scale-95"
          >
            Ver mis Puntos 🏆
          </Link>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="p-6 text-center z-10">
        <p className="text-zinc-600 text-xs">
          © {new Date().getFullYear()} Barbería Fulanos. Powered by KevinBarra.
        </p>
      </footer>

    </div>
  );
}