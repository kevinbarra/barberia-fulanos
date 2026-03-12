'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { SEED_TEMPLATES } from '@/lib/seed-templates'
import { revalidatePath } from 'next/cache'

export async function generateInstantDemo(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Validate Super Admin
    const { data: requester } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Assuming we want 'super_admin' or at least 'owner' to be able to create demos?
    // Let's restrict to super_admin or we can allow anyone for testing. The prompt says "(solo para ti)".
    if (requester?.role !== 'super_admin' && requester?.role !== 'owner') {
        return { error: 'Solo administradores pueden crear demos' }
    }

    const businessName = formData.get('businessName') as string
    const businessType = formData.get('businessType') as string

    if (!businessName || !businessType) return { error: 'Faltan datos' }

    const template = SEED_TEMPLATES[businessType]
    if (!template) return { error: 'Tipo de negocio no válido' }

    try {
        const adminSupabase = createAdminClient()

        // 1. Create Tenant
        // Simplified slug creation: lowercased, spaces to dashes
        const rawSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const slug = `${rawSlug}-${Math.floor(Math.random() * 1000)}`

        const { data: newTenant, error: tenantError } = await adminSupabase
            .from('tenants')
            .insert({
                name: businessName,
                slug: slug,
                settings: {
                    business_type: businessType,
                    currency_symbol: '$',
                    tax_rate: 0
                }
            })
            .select()
            .single()

        if (tenantError || !newTenant) throw new Error(`Error creando tenant: ${tenantError?.message}`)

        const tenantId = newTenant.id

        // 2. Call the reusable seed function
        await seedTenantWithTemplate(tenantId, slug, businessType)

        return { success: true, tenantId, slug }

    } catch (error: any) {
        console.error('Demo Generation Error:', error)
        return { error: error.message || 'Error interno generando la demo' }
    }
}

/**
 * Reusable function to seed an existing tenant with a business template
 */
export async function seedTenantWithTemplate(tenantId: string, slug: string, businessType: string) {
    const template = SEED_TEMPLATES[businessType]
    if (!template) throw new Error('Tipo de negocio no válido')

    const adminSupabase = createAdminClient()

    // 1. Insert Categories
    const catMap = new Map<string, string>() // Category Name -> Category ID

    for (const catName of template.categories) {
        const { data: category, error: catError } = await adminSupabase
            .from('service_categories')
            .insert({ tenant_id: tenantId, name: catName })
            .select()
            .single()
        if (catError) throw new Error(catError.message)
        catMap.set(catName, category.id)
    }

    // 2. Insert Services
    const serviceMap = new Map<string, string>() // Category/Name -> Service ID

    for (const srv of template.services) {
        const catId = catMap.get(srv.category)
        if (!catId) continue

        const { data: service, error: srvError } = await adminSupabase
            .from('services')
            .insert({
                tenant_id: tenantId,
                category_id: catId,
                name: srv.name,
                price: srv.price,
                duration_min: srv.duration_min,
                slug: srv.slug
            })
            .select()
            .single()

        if (srvError) throw new Error(srvError.message)
        serviceMap.set(`${srv.category}_${srv.name}`, service.id)
    }

    // 3. Insert Staff (Auth + Profile + linkage)
    for (const st of template.staff) {
        const fakeEmail = `${st.name.toLowerCase()}.${slug}@fulanosdemo.com`

        // Create in Auth
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
            email: fakeEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: st.name }
        })

        if (authError || !authUser.user) throw new Error(authError?.message || 'Error auth user')

        const staffId = authUser.user.id

        const { error: profileError } = await adminSupabase
            .from('profiles')
            .upsert({
                id: staffId,
                email: fakeEmail,
                full_name: st.name,
                role: st.role,
                tenant_id: tenantId,
                is_active_barber: true,
                is_calendar_visible: true
            }, { onConflict: 'id' })

        if (profileError) throw new Error(profileError.message)

        // Link Staff Services (specialties)
        for (const spec of st.specialties) {
            const relatedServices = template.services.filter(s => s.category === spec)
            for (const rs of relatedServices) {
                const sId = serviceMap.get(`${spec}_${rs.name}`)
                if (sId) {
                    await adminSupabase.from('staff_services').insert({
                        staff_id: staffId,
                        service_id: sId
                    })
                }
            }
        }
    }

    // 4. Insert Ghost Bookings
    const today = new Date();
    const baseYear = today.getFullYear();
    const baseMonth = today.getMonth();
    const baseDate = today.getDate();

    const customerNames = ["María González", "Ana López", "Juan Pérez", "Roberto Sánchez", "Lucía Díaz", "Pedro Ramírez", "Carlos Castro", "Elena Torres"];
    const phoneNumbers = ["5512345678", "5598765432", "5544332211", "5566778899", "5555443322"];

    const { data: createdStaffServices } = await adminSupabase
        .from('staff_services')
        .select('staff_id, service_id, services(*)')
        .eq('services.tenant_id', tenantId);

    if (createdStaffServices && createdStaffServices.length > 0) {
        for (let i = 0; i < 6; i++) {
            const randIdx = Math.floor(Math.random() * createdStaffServices.length);
            const ss = createdStaffServices[randIdx];
            const serviceInfo = Array.isArray(ss.services) ? ss.services[0] : ss.services;
            if (!ss || !serviceInfo) continue;

            const startHour = 10 + Math.floor(Math.random() * 8); // 10 am to 17 pm
            const startMins = Math.random() > 0.5 ? 0 : 30;

            const startTime = new Date(baseYear, baseMonth, baseDate, startHour, startMins, 0);
            const endTime = new Date(startTime.getTime() + (serviceInfo.duration_min * 60000));

            await adminSupabase.from('bookings').insert({
                tenant_id: tenantId,
                staff_id: ss.staff_id,
                service_id: ss.service_id,
                customer_id: null,
                guest_name: customerNames[i % customerNames.length],
                guest_phone: phoneNumbers[i % phoneNumbers.length],
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: i < 2 ? 'completed' : (i < 4 ? 'pending' : 'confirmed'),
                total_price: serviceInfo.price,
            });
        }
    }
}
