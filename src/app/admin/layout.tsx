import MobileAdminNav from "@/components/ui/MobileAdminNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase/server";
import RealtimeBookingNotifications from "@/components/admin/RealtimeBookingNotifications";
import KioskProtectedRouteProvider from "@/components/admin/KioskProtectedRouteProvider";
import TenantSuspendedScreen from "@/components/TenantSuspendedScreen";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userRole = 'staff';
    let tenantId = '';
    let tenantName = 'AgendaBarber'; // Default/fallback
    let tenantStatus = 'active'; // Default to active

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants(name, subscription_status)')
            .eq('id', user.id)
            .single();
        userRole = profile?.role || 'staff';
        tenantId = profile?.tenant_id || '';
        // Extract tenant data from joined data
        const tenantData = profile?.tenants as unknown as { name: string; subscription_status: string } | null;
        tenantName = tenantData?.name || 'AgendaBarber';
        tenantStatus = tenantData?.subscription_status || 'active';
    }

    // Check if tenant is suspended - block access for non-super_admins
    const isSuperAdmin = userRole === 'super_admin';
    const isTenantSuspended = tenantStatus !== 'active';

    if (isTenantSuspended && !isSuperAdmin) {
        return <TenantSuspendedScreen tenantName={tenantName} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">
            <MobileAdminNav role={userRole} tenantId={tenantId} tenantName={tenantName} />
            <Sidebar role={userRole} tenantName={tenantName} />
            <div className="flex-1 flex flex-col min-h-screen relative w-full pt-16 lg:pt-0">
                {/* Realtime notifications - Desktop only (Mobile has it in header) */}
                {tenantId && (
                    <div className="fixed top-4 right-4 z-50 hidden lg:block">
                        <RealtimeBookingNotifications tenantId={tenantId} />
                    </div>
                )}
                <main className="flex-1 pb-8 w-full">
                    {/* Kiosk PIN protection for sensitive routes */}
                    <KioskProtectedRouteProvider userRole={userRole} tenantId={tenantId}>
                        {children}
                    </KioskProtectedRouteProvider>
                </main>
            </div>
        </div>
    );
}