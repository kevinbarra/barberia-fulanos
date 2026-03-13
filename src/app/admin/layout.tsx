import MobileAdminNav from "@/components/ui/MobileAdminNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase/server";
import RealtimeBookingNotifications from "@/components/admin/RealtimeBookingNotifications";
import KioskProtectedRouteProvider from "@/components/admin/KioskProtectedRouteProvider";
import KioskModeProvider from "@/components/admin/KioskModeProvider";
import TenantSuspendedScreen from "@/components/TenantSuspendedScreen";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import AutoRefreshWrapper from "@/components/admin/AutoRefreshWrapper";
import { ROOT_DOMAIN, extractTenantSlug } from "@/lib/constants";
import { BusinessVocabularyProvider, BusinessType } from "@/providers/BusinessVocabularyProvider";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    // Add noredirect param to prevent infinite loop between /login and /admin
    if (!user) {
        redirect('/login?noredirect=1');
    }

    // Get current subdomain and path context
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const pathname = headersList.get('x-pathname') || '';
    const currentSubdomain = extractTenantSlug(hostname);
    const isOnWww = hostname.startsWith('www.') || hostname === ROOT_DOMAIN;

    // Check if this is a platform route - skip tenant sidebar
    const isPlatformRoute = pathname.startsWith('/admin/platform');

    // Get user profile and tenant info
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenants(slug, name, subscription_status, settings)')
        .eq('id', user.id)
        .single();

    const userRole = profile?.role || 'customer';
    const isSuperAdmin = userRole === 'super_admin';
    const isStaffOrOwner = userRole === 'owner' || userRole === 'staff';

    // Extract user's tenant info from profile
    let tenantData = profile?.tenants as unknown as {
        slug: string;
        name: string;
        subscription_status: string;
        settings: any;
    } | null;
    let userTenantSlug = tenantData?.slug || null;
    let tenantName = tenantData?.name || 'AgendaBarber';
    let tenantStatus = tenantData?.subscription_status || 'active';
    let tenantId = profile?.tenant_id || '';
    let businessType = (tenantData?.settings?.business_type as BusinessType) || 'barber';

    // SUPER ADMIN ON TENANT SUBDOMAIN: Fetch tenant data from the subdomain
    // This allows super admin to properly access any tenant's admin panel
    if (isSuperAdmin && currentSubdomain && !isOnWww) {
        console.log('[ADMIN LAYOUT] Super admin on tenant subdomain:', currentSubdomain);
        const { data: subdomainTenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, slug, name, subscription_status, settings')
            .eq('slug', currentSubdomain)
            .single();

        console.log('[ADMIN LAYOUT] Tenant lookup result:', subdomainTenant, 'error:', tenantError);

        if (subdomainTenant) {
            const subdomainData = subdomainTenant as any;
            tenantData = {
                slug: subdomainData.slug,
                name: subdomainData.name,
                subscription_status: subdomainData.subscription_status,
                settings: subdomainData.settings
            };
            userTenantSlug = subdomainData.slug;
            tenantName = subdomainData.name;
            tenantStatus = subdomainData.subscription_status;
            tenantId = subdomainData.id;
            businessType = (subdomainData.settings?.business_type as BusinessType) || 'barber';
        }
    }

    console.log('[ADMIN LAYOUT] Final state:', { userRole, isSuperAdmin, currentSubdomain, isOnWww, tenantName, tenantId });

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
        // SECURITY: Only allow platform management from the main domain
        if (!isOnWww) {
            console.log('[SECURITY] Forbidden platform access from subdomain:', hostname);
            redirect('/admin');
        }
        return <>{children}</>;
    }

    // Kiosk mode is now managed via localStorage in KioskModeProvider
    // No server-side cookie reading needed

    return (
        <BusinessVocabularyProvider businessType={businessType}>
            <KioskModeProvider userRole={userRole} userEmail={user.email || ''} tenantId={tenantId}>
                <div className="min-h-screen bg-gray-50 flex flex-row">
                    <AutoRefreshWrapper />
                    <MobileAdminNav role={userRole} tenantId={tenantId} tenantName={tenantName} />
                    <Sidebar role={userRole} tenantName={tenantName} isMainDomain={isOnWww} />
                    <div className="flex-1 flex flex-col min-h-[100dvh] relative w-full pt-16 lg:pt-0">
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
            </KioskModeProvider>
        </BusinessVocabularyProvider>
    );
}