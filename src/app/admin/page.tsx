import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <div className="mt-4 p-4 bg-white shadow rounded border">
                <p className="text-gray-600">Bienvenido, Jefe.</p>
                <p className="font-mono text-sm mt-2">ID: {user.id}</p>
                <p className="font-mono text-sm">Email: {user.email}</p>
            </div>
        </div>
    );
}