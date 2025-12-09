import MobileAdminNav from "@/components/ui/MobileAdminNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase/server";
import RealtimeBookingNotifications from "@/components/admin/RealtimeBookingNotifications";
import KioskProtectedRouteProvider from "@/components/admin/KioskProtectedRouteProvider";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userRole = 'staff';
    let tenantId = '';

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();
        userRole = profile?.role || 'staff';
        tenantId = profile?.tenant_id || '';
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">
            <MobileAdminNav role={userRole} tenantId={tenantId} />
            <Sidebar role={userRole} />
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