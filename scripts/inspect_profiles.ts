import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfiles() {
    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) return;
    const tenantId = tenant.id;

    // Obtener perfiles de administradores o personal
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active_barber')
        .eq('tenant_id', tenantId)
        .in('role', ['owner', 'super_admin', 'staff']);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('--- Administradores y Staff en Fulanos ---');
    console.log(profiles);
}

inspectProfiles();
