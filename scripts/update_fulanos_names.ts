import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFulanosNames() {
    console.log('--- Actualización de Servicios y Categorías de Fulanos ---');

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
    const menuEsencialCat = categories.find(c => c.name.includes('Menú Esencial'));

    if (ritualesCat) {
        console.log(`Renombrando categoría "${ritualesCat.name}" -> "💎 Rituales"`);
        const { error } = await supabase
            .from('service_categories')
            .update({ name: '💎 Rituales' })
            .eq('id', ritualesCat.id);
        if (error) console.error('Error renombrando rituales:', error);
    }

    let menuClasicoId = '';
    if (menuEsencialCat) {
        menuClasicoId = menuEsencialCat.id;
        console.log(`Renombrando categoría "${menuEsencialCat.name}" -> "⚪ Menú Clásico"`);
        const { error } = await supabase
            .from('service_categories')
            .update({ name: '⚪ Menú Clásico' })
            .eq('id', menuEsencialCat.id);
        if (error) console.error('Error renombrando menú esencial:', error);
    }

    // 3. Renombrar servicios redundantes ("Fulanos")
    const servicesToRename = [
        { old: 'Ritual Clásico Fulanos', new: 'Ritual Clásico' },
        { old: 'Ritual Urbano Fulanos', new: 'Ritual Urbano' },
        { old: 'Experiencia Total Fulanos', new: 'Experiencia Total' }
    ];

    for (const item of servicesToRename) {
        // Buscar el servicio
        const { data: service } = await supabase
            .from('services')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .eq('name', item.old)
            .maybeSingle();

        if (service) {
            console.log(`Renombrando servicio "${service.name}" -> "${item.new}"`);
            const { error } = await supabase
                .from('services')
                .update({ name: item.new })
                .eq('id', service.id);
            if (error) console.error(`Error al renombrar ${item.old}:`, error);
        } else {
            console.log(`Servicio "${item.old}" no encontrado (tal vez ya fue renombrado).`);
        }
    }

    // 4. Agregar el servicio de "Corte Escolar" por $150
    if (menuClasicoId) {
        // Verificar si el servicio ya existe
        const { data: existingService } = await supabase
            .from('services')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('name', 'Corte Escolar')
            .maybeSingle();

        if (existingService) {
            console.log('El servicio "Corte Escolar" ya existe en la base de datos.');
        } else {
            console.log('Creando servicio "Corte Escolar" por $150...');
            const { error } = await supabase
                .from('services')
                .insert({
                    tenant_id: tenantId,
                    category_id: menuClasicoId,
                    category: '⚪ Menú Clásico',
                    name: 'Corte Escolar',
                    price: 150,
                    duration_min: 30,
                    is_active: true,
                    order: 9, // un orden razonable para colocarlo
                    description: 'Corte de cabello escolar para niños y jóvenes.'
                });
            if (error) {
                console.error('Error creando Corte Escolar:', error);
            } else {
                console.log('✅ Servicio "Corte Escolar" creado con éxito.');
            }
        }
    } else {
        console.error('No se pudo encontrar el ID de la categoría para Menú Clásico.');
    }

    console.log('--- Proceso de actualización finalizado ---');
}

updateFulanosNames();
