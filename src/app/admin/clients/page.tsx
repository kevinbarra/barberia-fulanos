import { getClientsWithWarnings } from '../no-shows/actions';
import ClientWarningsTable from '@/components/admin/ClientWarningsTable';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    const clients = await getClientsWithWarnings();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Clientes con Advertencias</h1>
                    <p className="text-gray-500 text-sm">Gestión de No-Shows y Vetos</p>
                </div>
            </div>

            <ClientWarningsTable clients={clients || []} />
        </div>
    );
}
