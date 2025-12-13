import { createClient } from "@/utils/supabase/server";
import { headers, cookies } from "next/headers";

export default async function DebugSessionPage() {
    const supabase = await createClient();
    const headersList = await headers();
    const cookieStore = await cookies();

    // Get session/user info
    const sessionRes = await supabase.auth.getSession();
    const userRes = await supabase.auth.getUser();

    // Get environment info
    const hostname = headersList.get('host') || 'unknown';
    const env = process.env.NODE_ENV;

    // Serialize for display
    const debugInfo = {
        hostname,
        environment: env,
        cookies: cookieStore.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 10) + '...' })),
        session: {
            hasSession: !!sessionRes.data.session,
            error: sessionRes.error?.message
        },
        user: {
            hasUser: !!userRes.data.user,
            id: userRes.data.user?.id,
            email: userRes.data.user?.email,
            error: userRes.error?.message
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto font-mono text-sm bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug Session</h1>

            <div className="bg-white p-6 rounded shadow space-y-4">
                <section>
                    <h2 className="font-bold text-blue-600 mb-2">Environment</h2>
                    <pre className="bg-gray-100 p-2 rounded">{JSON.stringify({ hostname, env }, null, 2)}</pre>
                </section>

                <section>
                    <h2 className="font-bold text-green-600 mb-2">Auth Status</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-bold">getSession()</h3>
                            <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(debugInfo.session, null, 2)}</pre>
                        </div>
                        <div>
                            <h3 className="font-bold">getUser()</h3>
                            <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(debugInfo.user, null, 2)}</pre>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="font-bold text-purple-600 mb-2">Cookies ({debugInfo.cookies.length})</h2>
                    <div className="bg-gray-100 p-2 rounded max-h-60 overflow-auto">
                        {debugInfo.cookies.map(c => (
                            <div key={c.name} className="mb-1 flex justify-between">
                                <span className="font-bold">{c.name}</span>
                                <span className="text-gray-500">{c.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="mt-8 text-gray-500 text-xs text-center border-t pt-4">
                <p>Do not leave this page active in production indefinitely.</p>
            </div>
        </div>
    );
}
