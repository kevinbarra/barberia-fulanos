import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function simplifyCategories() {
    console.log('--- Simplificación de Categorías: Fulanos ---');

    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) return;
    const tenantId = tenant.id;

    // 1. Obtener todas las categorías
    const { data: categories } = await supabase.from('service_categories').select('id, name').eq('tenant_id', tenantId);
    if (!categories) return;

    const rituales = categories.find(c => c.name.toUpperCase().includes('RITUALES'));
    const menuEsencial = categories.find(c => c.name.toUpperCase().includes('ESENCIAL'));

    if (!rituales || !menuEsencial) {
        console.error('No se encontraron las categorías principales.');
        return;
    }

    // 2. Mover servicios de otras categorías a Menú Esencial
    const otherCategoryIds = categories
        .filter(c => c.id !== rituales.id && c.id !== menuEsencial.id)
        .map(c => c.id);

    if (otherCategoryIds.length > 0) {
        console.log(`Moviendo servicios de ${otherCategoryIds.length} categorías a Menú Esencial...`);
        await supabase
            .from('services')
            .update({ category_id: menuEsencial.id })
            .in('category_id', otherCategoryIds)
            .eq('tenant_id', tenantId);
        
        // 3. Desactivar (o eliminar si prefieres, pero ocultar es más seguro) las categorías extras
        // En este sistema, si no tienen servicios, no deberían aparecer, pero por seguridad las marcamos/eliminamos
        console.log('Eliminando categorías extras...');
        await supabase.from('service_categories').delete().in('id', otherCategoryIds);
    }

    // 4. Asegurar orden de las dos categorías que quedan
    await supabase.from('service_categories').update({ order: 1 }).eq('id', rituales.id);
    await supabase.from('service_categories').update({ order: 2 }).eq('id', menuEsencial.id);

    console.log('✅ Categorías simplificadas: Solo quedan Rituales y Menú Esencial.');
    console.log('--- Proceso terminado ---');
}

simplifyCategories();
