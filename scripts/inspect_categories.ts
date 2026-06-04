import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCategories() {
    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) return;
    const tenantId = tenant.id;

    // Obtener categorías
    const { data: categories } = await supabase
        .from('service_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order', { ascending: true });

    console.log('--- Categorías en Fulanos ---');
    console.log(categories);

    // Obtener todos los servicios con su id de categoría
    const { data: services } = await supabase
        .from('services')
        .select('id, name, category_id, category')
        .eq('tenant_id', tenantId);

    console.log('--- Servicios y sus IDs de Categoría ---');
    console.log(services);
}

inspectCategories();
