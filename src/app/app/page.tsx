// This is a server component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMyLoyaltyStatus } from './loyalty-actions';
import { getUserTenantSlug } from '@/lib/tenant';
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

    // ========== STEP 2: DETERMINE ACTIVE TENANT (Context Aware) ==========
    const headerList = await headers();
    const hostname = headerList.get("host") || "";
    const currentSlug = extractSubdomain(hostname);

    // Fallback to user's default tenant if no subdomain
    const targetSlug = currentSlug || await getUserTenantSlug();

    // Resolve tenant ID from slug
    let activeTenantId: string | null = null;
    let activeTenantName = "";

    if (targetSlug) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name')
            .eq('slug', targetSlug)
            .single();

        if (tenant) {
            activeTenantId = tenant.id;
            activeTenantName = tenant.name;
        }
    }

    // Ultimate fallback: use profile's tenant_id
    if (!activeTenantId && profile?.tenant_id) {
        activeTenantId = profile.tenant_id as string;
    }

    // ========== STEP 3: TENANT-ISOLATED QUERIES ==========

    // Consultar Próxima Cita Activa (ISOLATED)
    let upcomingBookingsQuery = supabase
        .from("bookings")
        .select(`
            id, start_time, status, tenant_id,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .neq("status", "completed")
        .neq("status", "no_show")
        .order("start_time", { ascending: true })
        .limit(1);

    if (activeTenantId) {
        upcomingBookingsQuery = upcomingBookingsQuery.eq("tenant_id", activeTenantId);
    }

    const { data: upcomingBookings } = await upcomingBookingsQuery;
    const nextBooking = upcomingBookings?.[0];

    // Consultar Citas Pasadas (historial) (ISOLATED)
    let pastBookingsQuery = supabase
        .from("bookings")
        .select(`
            id, start_time, status, tenant_id,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .or('status.eq.completed,status.eq.cancelled,status.eq.no_show')
        .order("start_time", { ascending: false })
        .limit(10);

    if (activeTenantId) {
        pastBookingsQuery = pastBookingsQuery.eq("tenant_id", activeTenantId);
    }

    const { data: pastBookings } = await pastBookingsQuery;

    // Consultar Transacciones (ISOLATED)
    let historyQuery = supabase
        .from("transactions")
        .select("amount, created_at, points_earned, tenant_id, services(name)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    if (activeTenantId) {
        historyQuery = historyQuery.eq("tenant_id", activeTenantId);
    }

    const { data: history } = await historyQuery;

    // Cargar estado de lealtad
    const loyaltyStatus = await getMyLoyaltyStatus();

    // Ver si hubo un no-show reciente (ISOLATED)
    let noShowQuery = supabase
        .from("bookings")
        .select("start_time, tenant_id, services(name)")
        .eq("customer_id", user.id)
        .eq("status", "no_show")
        .order("start_time", { ascending: false })
        .limit(1);

    if (activeTenantId) {
        noShowQuery = noShowQuery.eq("tenant_id", activeTenantId);
    }

    const { data: lastNoShow } = await noShowQuery.maybeSingle();

    // Check si es reciente (últimas 48h)
    const showNoShowAlert = lastNoShow &&
        new Date(lastNoShow.start_time).getTime() > Date.now() - 48 * 60 * 60 * 1000;

    return (
        <ClientDashboardUI
            user={user}
            profile={profile}
            role={profile?.role || 'client'}
            nextBooking={nextBooking ?? null}
            pastBookings={pastBookings || []}
            history={history || []}
            loyaltyStatus={loyaltyStatus}
            showNoShowAlert={!!showNoShowAlert}
            tenantSlug={targetSlug || ''}
        />
    );
}