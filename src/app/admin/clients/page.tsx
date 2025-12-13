import { getClientsWithWarnings } from '../no-shows/actions';
import ClientWarningsTable from '@/components/admin/ClientWarningsTable';
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

    const clients = await getClientsWithWarnings();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Clientes con Advertencias</h1>
                    <p className="text-gray-500 text-sm">Gestión de No-Shows y Vetos</p>
                </div>
            </div>

            <ClientWarningsTable
                clients={clients || []}
                userRole={profile?.role || 'staff'}
            />
        </div>
    );
}
