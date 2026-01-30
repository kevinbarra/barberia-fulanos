import { getClientsWithWarnings } from '../no-shows/actions';
import { getAllClients } from './actions';
import ClientWarningsTable from '@/components/admin/ClientWarningsTable';
import AllClientsTable from '@/components/admin/clients/AllClientsTable';
import ClientsPageTabs from '@/components/admin/clients/ClientsPageTabs';
import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { isKioskModeActive } from '@/utils/kiosk-server';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const tenantId = await getTenantIdForAdmin();
    if (!tenantId) redirect('/login');

    // SECURITY: Block access in kiosk mode
    if (await isKioskModeActive(tenantId)) {
        redirect('/admin');
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

    // Fetch all datasets in parallel
    const [allClients, archivedClients, warningClients] = await Promise.all([
        getAllClients('active'),
        getAllClients('archived'),
        getClientsWithWarnings()
    ]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <ClientsPageTabs
                allClients={allClients}
                archivedClients={archivedClients}
                warningClients={warningClients || []}
                userRole={profile?.role || 'staff'}
            />
        </div>
    );
}
