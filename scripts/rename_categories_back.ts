import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function renameCategoriesBack() {
    console.log('--- Renombrando Categorías de Fulanos a los Originales ---');

    // 1. Obtener ID del tenant 'fulanos'
    const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    if (!tenant) {
        console.error('Tenant "fulanos" no encontrado.');
        return;
    }
    const tenantId = tenant.id;

    // 2. Obtener categorías actuales
    const { data: categories } = await supabase
        .from('service_categories')
        .select('*')
        .eq('tenant_id', tenantId);

    if (!categories) {
        console.error('No se encontraron categorías.');
        return;
    }

    const ritualesCat = categories.find(c => c.name.includes('Rituales'));
    const menuClasicoCat = categories.find(c => c.name.includes('Menú Clásico') || c.name.includes('Menú Esencial'));

    if (ritualesCat) {
        console.log(`Renombrando categoría "${ritualesCat.name}" -> "💎 Rituales (Premium)"`);
        const { error } = await supabase
            .from('service_categories')
            .update({ name: '💎 Rituales (Premium)' })
            .eq('id', ritualesCat.id);
        if (error) console.error('Error renombrando rituales:', error);
    }

    if (menuClasicoCat) {
        console.log(`Renombrando categoría "${menuClasicoCat.name}" -> "⚪ Menú Esencial"`);
        const { error } = await supabase
            .from('service_categories')
            .update({ name: '⚪ Menú Esencial' })
            .eq('id', menuClasicoCat.id);
        if (error) console.error('Error renombrando menú esencial:', error);
    }

    // 3. Sincronizar en la tabla de servicios
    console.log('--- Sincronizando en la tabla de servicios ---');
    const { data: updatedCategories } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('tenant_id', tenantId);

    if (updatedCategories) {
        for (const cat of updatedCategories) {
            console.log(`Actualizando servicios para "${cat.name}"...`);
            const { error } = await supabase
                .from('services')
                .update({ category: cat.name })
                .eq('category_id', cat.id)
                .eq('tenant_id', tenantId);
            if (error) {
                console.error(`Error actualizando servicios de ${cat.name}:`, error);
            }
        }
    }

    console.log('✅ Finalizado.');
}

renameCategoriesBack();
