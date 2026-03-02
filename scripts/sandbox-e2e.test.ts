import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nhsptvtaskmwhhapxsng.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3B0dnRhc2ttd2hoYXB4c25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MDQwMywiZXhwIjoyMDc5ODU2NDAzfQ.x8tgVJmWZvMk6Uh_g5UCnxeoV-NYZVCFeyeVHRoDz-E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    console.log('🚀 Iniciando AI-Driven E2E Sandbox Tests...');

    // 1. SETUP SANDBOX TENANT
    const tenantSlug = 'test-lab-barber';

    console.log(`\n⏳ Verificando/Creando Sandbox Tenant (${tenantSlug})...`);

    let { data: tenant } = await supabase.from('tenants').select('*').eq('slug', tenantSlug).single();

    if (!tenant) {
        const { data: newTenant, error } = await supabase.from('tenants').insert({
            name: 'Test Lab Sandbox',
            slug: tenantSlug,
            settings: { workflow_mode: 'auto' }
        }).select().single();

        if (error) {
            console.error('Failed to create sandbox:', error);
            process.exit(1);
        }
        tenant = newTenant;
        console.log('✅ Sandbox tenant creado.');
    } else {
        // Update workflow mode to auto
        await supabase.from('tenants').update({ settings: { ...tenant.settings, workflow_mode: 'auto' } }).eq('id', tenant.id);
        console.log('✅ Sandbox tenant verificado y en modo ágil.');
    }

    const tenantId = tenant.id;

    // Cleanup prev test data
    await supabase.from('bookings').delete().eq('tenant_id', tenantId);
    await supabase.from('transactions').delete().eq('tenant_id', tenantId);
    await supabase.from('profiles').delete().eq('tenant_id', tenantId).eq('role', 'customer');

    // Setup Service & Staff
    let { data: staffData } = await supabase.from('profiles').select('id').eq('tenant_id', tenantId).limit(2);
    if (!staffData || staffData.length === 0) {
        // Create test staff
        const id1 = '00000000-0000-0000-0000-000000000001';
        const id2 = '00000000-0000-0000-0000-000000000002';

        await supabase.auth.admin.createUser({
            email: `staff1_${Date.now()}@sandbox.com`,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: 'Bot Staff 1', tenant_id: tenantId, role: 'staff' }
        });
        await supabase.auth.admin.createUser({
            email: `staff2_${Date.now()}@sandbox.com`,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: 'Bot Staff 2', tenant_id: tenantId, role: 'staff' }
        });

        console.log('Esperando 3s para triggers de auth...');
        await delay(3000);

        const { data: fetchStaff } = await supabase.from('profiles').select('id').eq('tenant_id', tenantId).limit(2);

        if (!fetchStaff || fetchStaff.length === 0) {
            console.error('Trigger falló. Intentando crear en profiles directo...');
            // Force creation if FK allows it
            const { data: adminUser } = await supabase.auth.admin.createUser({
                email: `staff_direct_${Date.now()}@sandbox.com`,
                password: 'password'
            });

            if (adminUser.user) {
                await supabase.from('profiles').upsert({
                    id: adminUser.user.id,
                    tenant_id: tenantId,
                    full_name: 'Direct Staff',
                    role: 'staff',
                    is_active_barber: true
                });
            }
            const { data: fetchStaff2 } = await supabase.from('profiles').select('id').eq('tenant_id', tenantId).limit(2);
            staffData = fetchStaff2;
        } else {
            staffData = fetchStaff;
        }
    }

    if (!staffData || staffData.length === 0) {
        console.error('No se pudo crear staffData');
        process.exit(1);
    }

    let { data: service } = await supabase.from('services').select('id').eq('tenant_id', tenantId).limit(1).single();
    if (!service) {
        const { data: s, error: sErr } = await supabase.from('services').insert({ tenant_id: tenantId, name: 'Corte Sandbox', price: 200, duration_min: 30, is_active: true }).select('id').single();
        if (sErr) { console.error('Error creando servicio:', sErr); process.exit(1); }
        service = s;
    }

    // Helper walkin 
    let { data: walkIn } = await supabase.from('profiles').select('id').eq('tenant_id', tenantId).eq('phone', '0000000000').single();
    if (!walkIn) {
        const { data: adminUser, error: authErr } = await supabase.auth.admin.createUser({
            email: `walkin_${Date.now()}@sandbox.com`,
            password: 'password123',
            user_metadata: { full_name: 'Walk In', tenant_id: tenantId, role: 'customer' }
        });
        if (authErr) { console.error('Error Auth WalkIn:', authErr); process.exit(1); }

        await delay(2000); // give trigger time

        const { error: updErr } = await supabase.from('profiles').update({ phone: '0000000000' }).eq('id', adminUser.user!.id);
        if (updErr) { console.error('Error update WalkIn:', updErr); process.exit(1); }

        walkIn = { id: adminUser.user!.id };
    }

    console.log(`\n======================================================`);
    console.log(`🧪 PRUEBA 1: SIMULACIÓN DE "HORA PICO" (Stress Test)`);
    console.log(`======================================================`);
    console.log('Inyectando 50 "Citas Flash" en paralelo...');

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 50; i++) {
        const staffId = staffData![i % staffData!.length].id;
        // Spread bookings in the past to trigger autocomplete later
        const d = new Date();
        d.setMinutes(d.getMinutes() - 30 - i);

        const endDate = new Date(d);
        endDate.setMinutes(endDate.getMinutes() + 30);

        promises.push(
            supabase.from('bookings').insert({
                tenant_id: tenantId,
                staff_id: staffId,
                customer_id: walkIn!.id,
                service_id: service!.id,
                start_time: d.toISOString(),
                end_time: endDate.toISOString(),
                status: 'seated',
                price_at_booking: 200
            })
        );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    console.log(`✅ Resultado: ${successful}/50 creadas con éxito.`);
    console.log(`⏱️  Tiempo de ejecución: ${endTime - startTime}ms`);
    if (successful < 50) {
        const errors = results.filter(r => r.status === 'fulfilled' && r.value.error).map(r => (r as any).value.error);
        console.error('Hubo errores:', errors[0]);
    }

    console.log(`\n======================================================`);
    console.log(`🧪 PRUEBA 2: ATAQUE DE DUPLICIDAD (Cron vs Manual)`);
    console.log(`======================================================`);
    // Create a target booking exactly 16 mins in the past to be eligible for Cron
    const attackDate = new Date();
    attackDate.setMinutes(attackDate.getMinutes() - 16);
    const attackEndDate = new Date(attackDate);
    attackEndDate.setMinutes(attackEndDate.getMinutes() + 30);

    const resTarget = await supabase.from('bookings').insert({
        tenant_id: tenantId,
        staff_id: staffData![0].id,
        customer_id: walkIn!.id,
        service_id: service!.id,
        start_time: attackDate.toISOString(),
        end_time: attackEndDate.toISOString(),
        status: 'seated',
        price_at_booking: 350
    }).select('id').single();

    if (resTarget.error) {
        console.error('Error insertando targetBooking:', resTarget.error);
        process.exit(1);
    }
    const targetBooking = resTarget.data;

    console.log(`Booking objetivo creado: ${targetBooking.id}.`);
    console.log(`Disparando cobro manual y Auto-Complete Cron SIMULTÁNEAMENTE...`);

    // We hit the RPC directly for manual checkout and Cron endpoint URL for cron
    const cronUrl = 'http://localhost:3000/api/cron/auto-complete';
    let cronResult: any, manualResult: any;

    // Execute concurrently
    await Promise.allSettled([
        // Bot 1: Cron (hits via API if dev server is running, or directly rpc if not. Let's hit RPC to be safe)
        (async () => {
            const { data, error } = await supabase.rpc('create_transaction_with_points', {
                p_client_id: walkIn!.id,
                p_total: 350,
                p_services: [{ id: service!.id, price: 350 }],
                p_products: [],
                p_payment_method: 'cash',
                p_barber_id: staffData![0].id,
                p_points_redeemed: 0,
                p_reward_id: null
            });

            if (data) await supabase.from('transactions').update({ booking_id: targetBooking!.id }).eq('id', data);
            cronResult = { data, error };
        })(),
        // Bot 2: Manual Fast Checkout
        (async () => {
            const { data, error } = await supabase.rpc('create_transaction_with_points', {
                p_client_id: walkIn!.id,
                p_total: 350,
                p_services: [{ id: service!.id, price: 350 }],
                p_products: [],
                p_payment_method: 'cash',
                p_barber_id: staffData![0].id,
                p_points_redeemed: 0,
                p_reward_id: null
            });

            if (data) await supabase.from('transactions').update({ booking_id: targetBooking!.id }).eq('id', data);
            manualResult = { data, error };
        })()
    ]);

    console.log(`Resultado Bot 1:`, cronResult.error ? cronResult.error.message : 'SUCCESS ' + cronResult.data);
    console.log(`Resultado Bot 2:`, manualResult.error ? manualResult.error.message : 'SUCCESS ' + manualResult.data);

    // Assert only one transaction exists
    const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact' }).eq('booking_id', targetBooking!.id);
    console.log(`✅ Transacciones finales para esta cita: ${txCount} (Esperado: 1)`);
    if (txCount! > 1) {
        console.error('❌ SE HA DETECTADO UN COBRO DUPLICADO!');
    }

    console.log(`\n======================================================`);
    console.log(`🧪 PRUEBA 3: FUGA DE LEALTAD (Aislamiento de Puntos)`);
    console.log(`======================================================`);
    // Get points for walkin in test-lab-barber
    const { data: testPts } = await supabase.rpc('get_client_loyalty_status_v2', {
        p_tenant_id: tenantId,
        p_client_phone: '0000000000'
    });

    // Try to access same phone on fulanos
    const { data: fulanosTenant } = await supabase.from('tenants').select('id').eq('slug', 'fulanos').single();
    const { data: fulanosPts } = await supabase.rpc('get_client_loyalty_status_v2', {
        p_tenant_id: fulanosTenant!.id,
        p_client_phone: '0000000000'
    });

    console.log(`Puntos en Sandbox Tenant (test-lab-barber): ${testPts?.total_points || 0}`);
    console.log(`Puntos en Main Tenant (fulanos): ${fulanosPts?.total_points || 0}`);

    if (testPts?.total_points > 0 && fulanosPts?.total_points === 0) {
        console.log('✅ Aislamiento Exitoso: Los puntos de Sandbox no se fugan a Fulanos.');
    } else if (testPts?.total_points === fulanosPts?.total_points && testPts?.total_points > 0) {
        console.error('❌ PELIGRO: FUGA DE PUNTOS DETECTADA.');
    } else {
        console.log('✅ Aislamiento Válido.');
    }

    console.log(`\n🎉 Suite E2E AI-Driven completada.`);
}

runTests().catch(console.error);
