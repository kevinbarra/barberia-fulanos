// This is a server component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMyLoyaltyStatus } from './loyalty-actions';
import ClientDashboardUI from "@/components/client/ClientDashboardUI";

// Force dynamic to always show fresh data
export const dynamic = 'force-dynamic';

const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api'];

function extractSubdomain(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null;
    }
    const parts = hostname.replace(':443', '').replace(':80', '').split('.');
    if (parts.length >= 3) {
        const subdomain = parts[0];
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) {
            return subdomain;
        }
    }
    return null;
}

export default async function ClientAppPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // ========== STEP 1: GET USER PROFILE ==========
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, phone, role, tenant_id, loyalty_points, no_show_count, created_at")
        .eq("id", user.id)
        .single();

    // ========== STEP 2: DETERMINE ACTIVE TENANT (Hard Isolation) ==========
    const headerList = await headers();
    const hostname = headerList.get("host") || "";
    const currentSlug = extractSubdomain(hostname);

    let activeTenantId: string | null = null;
    let activeTenantName = "";
    let targetSlug = currentSlug;

    // Priority 1: Resolve from subdomain
    if (currentSlug) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name')
            .eq('slug', currentSlug)
            .single();

        if (tenant) {
            activeTenantId = tenant.id;
            activeTenantName = tenant.name;
        }
    }

    // Priority 2: Fall back to user's profile tenant (e.g. on www)
    if (!activeTenantId && profile?.tenant_id) {
        activeTenantId = profile.tenant_id as string;
        const { data: fallbackTenant } = await supabase
            .from('tenants')
            .select('slug, name')
            .eq('id', activeTenantId)
            .single();
        if (fallbackTenant) {
            targetSlug = fallbackTenant.slug;
            activeTenantName = fallbackTenant.name;
        }
    }

    // HARD ISOLATION: If no tenant resolved, show error — never query without filter
    if (!activeTenantId) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Sin contexto de barbería</h1>
                    <p className="text-zinc-400">No pudimos determinar a qué barbería perteneces.</p>
                </div>
            </div>
        );
    }

    // ========== STEP 3: TENANT-ISOLATED QUERIES (MANDATORY tenant_id) ==========

    // Consultar TODAS las Próximas Citas Activas (HARD ISOLATED)
    const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, status, tenant_id, guest_name,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("tenant_id", activeTenantId)
        .eq("customer_id", user.id)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .neq("status", "completed")
        .neq("status", "no_show")
        .order("start_time", { ascending: true });

    // Consultar Citas Pasadas (historial) (HARD ISOLATED)
    const { data: pastBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, status, tenant_id, guest_name,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("tenant_id", activeTenantId)
        .eq("customer_id", user.id)
        .or('status.eq.completed,status.eq.cancelled,status.eq.no_show')
        .order("start_time", { ascending: false })
        .limit(10);

    // Consultar Transacciones (HARD ISOLATED)
    const { data: history } = await supabase
        .from("transactions")
        .select("amount, created_at, points_earned, tenant_id, services(name)")
        .eq("tenant_id", activeTenantId)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // Cargar estado de lealtad (ISOLATED by tenant)
    const loyaltyStatus = await getMyLoyaltyStatus(activeTenantId);

    // Ver si hubo un no-show reciente (HARD ISOLATED)
    const { data: lastNoShow } = await supabase
        .from("bookings")
        .select("start_time, tenant_id, services(name)")
        .eq("tenant_id", activeTenantId)
        .eq("customer_id", user.id)
        .eq("status", "no_show")
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

    // Check si es reciente (últimas 48h)
    const showNoShowAlert = lastNoShow &&
        new Date(lastNoShow.start_time).getTime() > Date.now() - 48 * 60 * 60 * 1000;

    return (
        <ClientDashboardUI
            user={user}
            profile={profile}
            role={profile?.role || 'client'}
            upcomingBookings={upcomingBookings || []}
            pastBookings={pastBookings || []}
            history={history || []}
            loyaltyStatus={loyaltyStatus}
            showNoShowAlert={!!showNoShowAlert}
            tenantSlug={targetSlug || ''}
        />
    );
}