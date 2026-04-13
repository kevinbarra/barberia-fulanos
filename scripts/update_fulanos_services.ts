import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need service role to bypass RLS or I can use owner auth if I had it

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFulanosServices() {
    console.log('--- Actualizando servicios para Fulanos ---');

    // 1. Obtener el tenant_id de Fulanos
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'fulanos')
        .single();

    if (tenantError || !tenant) {
        console.error('Error al encontrar el tenant "fulanos":', tenantError?.message);
        return;
    }

    const tenantId = tenant.id;
    console.log(`Tenant ID: ${tenantId}`);

    // 1.5 Set default order to 99 for all services to push them to the bottom
    console.log('Seteando orden default 99...');
    await supabase
        .from('services')
        .update({ order: 99 })
        .eq('tenant_id', tenantId);

    // 2. Obtener servicios actuales para mapear IDs
    const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('tenant_id', tenantId);

    if (servicesError || !services) {
        console.error('Error al obtener servicios:', servicesError?.message);
        return;
    }

    // 3. Definir actualizaciones solicitadas
    // Manuel quiere:
    // 1. Cejas
    // 2. Corte Clásico
    // 3. Corte Urbano Fade
    // 4. Clásico Exprés
    // 5. Retoque Exprés (con descripción: "Contornos y rebaje de patillas")

    const updates = [
        { find: 'Cejas', name: 'Cejas', order: 1 },
        { find: 'Corte Clásico', name: 'Corte Clásico', order: 2 },
        { find: 'Urbano', name: 'Corte Urbano Fade', order: 3 },
        { find: 'Fade', name: 'Corte Urbano Fade', order: 3 },
        { find: 'Exprés', name: 'Clásico Exprés', order: 4 },
        { find: 'Retoque', name: 'Retoque Exprés', order: 5, description: 'Contornos y rebaje de patillas' }
    ];

    for (const update of updates) {
        const service = services.find(s => s.name.toLowerCase().includes(update.find.toLowerCase()));
        if (service) {
            console.log(`Renombrando y ordenando "${service.name}" -> "${update.name}"...`);
            const { error: updateError } = await supabase
                .from('services')
                .update({ 
                    name: update.name,
                    order: update.order, 
                    description: update.description || service.description || null 
                })
                .eq('id', service.id);
            
            if (updateError) {
                console.error(`Error actualizando "${update.name}":`, updateError.message);
            } else {
                console.log(`✅ "${update.name}" actualizado.`);
            }
        }
    }

    // 4. Mover Retoque Exprés a MENÚ ESENCIAL y limpiar categorías
    const { data: categories } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('tenant_id', tenantId);
    
    if (categories) {
        console.log('Categorías encontradas:', categories.map(c => c.name).join(', '));
        const menuEsencial = categories.find(c => c.name.toUpperCase().includes('ESENCIAL'));
        const extras = categories.find(c => c.name.toUpperCase().includes('EXTRAS'));

        if (menuEsencial) {
            console.log(`Usando categoría destino: ${menuEsencial.name} (ID: ${menuEsencial.id})`);
            
            // Actualizar el servicio para que use la nueva categoría
            const retoque = services.find(s => s.name.toLowerCase().includes('retoque'));
            if (retoque) {
                console.log(`Moviendo "${retoque.name}" a "${menuEsencial.name}"...`);
                await supabase
                    .from('services')
                    .update({ 
                        category_id: menuEsencial.id,
                        order: 5,
                        description: 'Contornos y rebaje de patillas'
                    })
                    .eq('id', retoque.id);
                console.log('✅ Retoque Exprés movido.');
            }

            if (extras) {
                // Verificar si EXTRAS quedó vacío y eliminarlo si es necesario
                const { count } = await supabase
                    .from('services')
                    .select('id', { count: 'exact', head: true })
                    .eq('category_id', extras.id);
                
                if (count === 0) {
                    console.log(`Eliminando categoría "${extras.name}" vacía...`);
                    await supabase.from('service_categories').delete().eq('id', extras.id);
                    console.log('✅ Categoría EXTRAS eliminada.');
                }
            }
        }

        if (menuEsencial) {
            await supabase.from('service_categories').update({ order: 1 }).eq('id', menuEsencial.id);
        }
    }

    console.log('--- Proceso terminado ---');
}

updateFulanosServices();
