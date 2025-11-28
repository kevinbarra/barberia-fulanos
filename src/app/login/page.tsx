import { login } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Barbería Fulanos
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Ingresa con tu correo electrónico
                    </p>
                </div>

                {/* ALERTA DE MENSAJE */}
                {params.message === 'check-email' && (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-200">
                        ✅ ¡Enlace enviado! Revisa tu correo electrónico (incluyendo Spam).
                    </div>
                )}

                {params.error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                        ❌ Ocurrió un error. Inténtalo de nuevo.
                    </div>
                )}

                <form className="mt-8 space-y-6">
                    <div className="rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="relative block w-full rounded-md border-0 p-3 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-md bg-black px-3 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            Enviar enlace mágico
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}