import MobileAdminNav from "@/components/ui/MobileAdminNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase/server";
import RealtimeBookingNotifications from "@/components/admin/RealtimeBookingNotifications";
import KioskProtectedRouteProvider from "@/components/admin/KioskProtectedRouteProvider";
import TenantSuspendedScreen from "@/components/TenantSuspendedScreen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AutoRefreshWrapper from "@/components/admin/AutoRefreshWrapper";

const ROOT_DOMAIN = 'agendabarber.pro';
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app'];

function extractTenantFromHostname(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null;
    }
    if (hostname.endsWith('.vercel.app')) {
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

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (!user) {
        redirect('/login');
    }

    // Get current subdomain and path context
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const pathname = headersList.get('x-pathname') || '';
    const currentSubdomain = extractTenantFromHostname(hostname);
    const isOnWww = hostname.startsWith('www.') || hostname === ROOT_DOMAIN;

    // Check if this is a platform route - skip tenant sidebar
    const isPlatformRoute = pathname.startsWith('/admin/platform');

    // Get user profile and tenant info
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenants(slug, name, subscription_status)')
        .eq('id', user.id)
        .single();

    const userRole = profile?.role || 'customer';
    const isSuperAdmin = userRole === 'super_admin';
    const isStaffOrOwner = userRole === 'owner' || userRole === 'staff';

    // Extract user's tenant info
    const tenantData = profile?.tenants as unknown as {
        slug: string;
        name: string;
        subscription_status: string
    } | null;
    const userTenantSlug = tenantData?.slug || null;
    const tenantName = tenantData?.name || 'AgendaBarber';
    const tenantStatus = tenantData?.subscription_status || 'active';
    const tenantId = profile?.tenant_id || '';

    // SECURITY CHECK: Verify user belongs to this subdomain's tenant
    // Super admin can access /admin/platform on www
    if (isSuperAdmin && isOnWww) {
        // Super admin on www - allow access to platform
    } else if (isSuperAdmin && currentSubdomain) {
        // Super admin on tenant subdomain - allow for debugging
    } else if (isStaffOrOwner && currentSubdomain && currentSubdomain !== userTenantSlug) {
        // Staff/Owner trying to access another tenant's /admin - redirect to /app
        redirect('/app');
    } else if (!isStaffOrOwner && !isSuperAdmin) {
        // Customer trying to access /admin - redirect to /app
        redirect('/app');
    }

    // Check if tenant is suspended
    const isTenantSuspended = tenantStatus !== 'active';
    if (isTenantSuspended && !isSuperAdmin) {
        return <TenantSuspendedScreen tenantName={tenantName} />;
    }

    // Platform route: render only children - platform has its own layout
    if (isPlatformRoute) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">
            <AutoRefreshWrapper />
            <MobileAdminNav role={userRole} tenantId={tenantId} tenantName={tenantName} />
            <Sidebar role={userRole} tenantName={tenantName} />
            <div className="flex-1 flex flex-col min-h-screen relative w-full pt-16 lg:pt-0">
                {/* Realtime notifications - Desktop only */}
                {tenantId && (
                    <div className="fixed top-4 right-4 z-50 hidden lg:block">
                        <RealtimeBookingNotifications tenantId={tenantId} />
                    </div>
                )}
                <main className="flex-1 pb-8 w-full">
                    <KioskProtectedRouteProvider userRole={userRole} tenantId={tenantId}>
                        {children}
                    </KioskProtectedRouteProvider>
                </main>
            </div>
        </div>
    );
}