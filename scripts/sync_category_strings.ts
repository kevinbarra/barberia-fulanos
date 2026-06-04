import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCategoryStrings() {
    console.log('--- Sincronizando nombres de categoría en tabla de servicios ---');

    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) return;
    const tenantId = tenant.id;

    // Obtener las categorías actuales
    const { data: categories } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('tenant_id', tenantId);

    if (!categories) return;

    for (const cat of categories) {
        console.log(`Actualizando servicios de la categoría "${cat.name}"...`);
        const { error, count } = await supabase
            .from('services')
            .update({ category: cat.name })
            .eq('category_id', cat.id)
            .eq('tenant_id', tenantId);
        
        if (error) {
            console.error(`Error actualizando servicios de ${cat.name}:`, error);
        } else {
            console.log(`Servicios actualizados con éxito.`);
        }
    }

    console.log('✅ Sincronización completada.');
}

syncCategoryStrings();
