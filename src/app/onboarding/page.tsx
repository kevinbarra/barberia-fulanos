import Link from 'next/link'

/**
 * ONBOARDING PLACEHOLDER PAGE
 * 
 * This page is shown to users who have no tenant memberships.
 * Full implementation TBD - for now just shows a placeholder.
 */
export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">✂️</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Bienvenido a AgendaBarber!
                </h1>

                <p className="text-gray-600 mb-6">
                    Parece que aún no tienes una barbería registrada.
                    Pronto podrás crear tu propio negocio aquí.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-amber-800 text-sm">
                        🚧 <strong>En construcción:</strong> El registro de nuevos negocios
                        estará disponible próximamente.
                    </p>
                </div>

                <Link
                    href="/login"
                    className="inline-block px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                    Volver al Login
                </Link>
            </div>
        </div>
    )
}
