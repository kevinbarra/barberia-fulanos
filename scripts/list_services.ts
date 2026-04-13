import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listServices() {
    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) return;
    const tenantId = tenant.id;

    const { data: services } = await supabase
        .from('services')
        .select('id, name, price, duration_min')
        .eq('tenant_id', tenantId);

    if (!services) {
        console.error('No services found.');
        return;
    }

    console.log('--- Servicios en Fulanos ---');
    services.forEach(s => {
        console.log(`[${s.id}] ${s.name} - $${s.price} - ${s.duration_min}min`);
    });
}

listServices();
