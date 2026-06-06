'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { seedTenantWithTemplate } from '../demo-generator/actions'

interface ProvisionResult {
    success: boolean;
    tenant_id?: string;
    tenant_slug?: string;
    owner_assigned?: boolean;
    message?: string;
}

export async function createTenant(formData: FormData) {
    const supabase = await createClient();

    // 1. Validar Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    // 2. Extraer datos
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const demoMode = formData.get('demo_mode') === 'true';
    const demoType = formData.get('demo_type') as string; // barbershop, salon, nails, skincare, none

    // DEMO MODE: Generate placeholder email if no real owner
    const ownerEmail = demoMode
        ? `demo-${slug}@agendabarber.internal`
        : (formData.get('owner_email') as string);

    // Nuevos campos (con defaults)
    const brandColor = (formData.get('brand_color') as string) || '#8b5cf6';
    const plan = (formData.get('plan') as string) || 'trial';
    const timezone = (formData.get('timezone') as string) || 'America/Mexico_City';

    if (!name || !slug) {
        return { error: 'Nombre y Slug son obligatorios.' };
    }
    if (!demoMode && !ownerEmail) {
        return { error: 'Email del dueño es obligatorio (o activa Modo Demo).' };
    }

    // 3. LLAMAR AL MOTOR ATÓMICO (SQL RPC)
    const { data, error } = await supabase.rpc('provision_tenant_atomic', {
        p_name: name,
        p_slug: slug,
        p_owner_email: ownerEmail,
        p_brand_color: brandColor,
        p_plan: plan,
        p_timezone: timezone,
        p_skip_default_seed: (demoType && demoType !== 'none') ? true : false
    });

    if (error) {
        console.error('Error provision_tenant_atomic:', error);
        if (error.message.includes('slug')) return { error: 'El slug (URL) ya está en uso.' };
        if (error.message.includes('Email')) return { error: 'Formato de email inválido.' };
        return { error: `Error del sistema: ${error.message}` };
    }

    const result = data as ProvisionResult;

    if (!result.success) {
        return { error: result.message || 'Error desconocido.' };
    }

    // Update logo_url if provided in the creation form
    const logoUrl = formData.get('logo_url') as string;
    if (logoUrl?.trim() && result.tenant_id) {
        try {
            await supabase
                .from('tenants')
                .update({ logo_url: logoUrl.trim() })
                .eq('id', result.tenant_id);
        } catch (logoError) {
            console.error('[PROVISION] Error updating logo_url:', logoError);
        }
    }

    // 4. SHOWCASE MODE: Seed demo data using the Demo Factory templates
    if (demoType && demoType !== 'none' && result.tenant_id) {
        try {
            await seedTenantWithTemplate(result.tenant_id, slug, demoType);
        } catch (seedError) {
            console.error('[SHOWCASE] Seed error:', seedError);
            // Don't fail the whole creation — tenant is already created
        }
    }

    // 5. Éxito
    revalidatePath('/admin/platform');
    const modeLabel = demoMode ? ' (Modo Demo)' : '';
    const showcaseLabel = (demoType && demoType !== 'none') ? ` + Datos de ${demoType}` : '';
    return { success: true, message: (result.message || 'Tenant creado.') + modeLabel + showcaseLabel };
}


// Delete tenant permanently — Super Admin only — requires slug confirmation
export async function deleteTenant(tenantId: string, confirmSlug: string) {
    const supabase = await createClient();

    // Validate Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    // Fetch tenant to verify slug match
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name')
        .eq('id', tenantId)
        .single();

    if (!tenant) return { error: 'Tenant no encontrado.' };
    if (tenant.slug !== confirmSlug.trim().toLowerCase()) {
        return { error: `El slug ingresado no coincide. Esperado: "${tenant.slug}"` };
    }

    // Cascade delete: bookings → services → staff_schedules → profiles → tenant
    try {
        await supabase.from('bookings').delete().eq('tenant_id', tenantId);
        await supabase.from('services').delete().eq('tenant_id', tenantId);
        await supabase.from('staff_schedules').delete().eq('tenant_id', tenantId);
        await supabase.from('time_blocks').delete().eq('tenant_id', tenantId);
        await supabase.from('profiles').update({ tenant_id: null, role: 'customer' }).eq('tenant_id', tenantId);
        await supabase.from('tenants').delete().eq('id', tenantId);
    } catch (err) {
        console.error('[DELETE TENANT]', err);
        return { error: 'Error durante la eliminación. Contacta soporte.' };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: `Negocio "${tenant.name}" eliminado permanentemente.` };
}
export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'suspended') {
    const supabase = await createClient();

    // Validate Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    const { error } = await supabase
        .from('tenants')
        .update({ subscription_status: newStatus })
        .eq('id', tenantId);

    if (error) {
        return { error: `Error al cambiar status: ${error.message}` };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: `Tenant ${newStatus === 'active' ? 'activado' : 'suspendido'} exitosamente.` };
}


// Update tenant data (name, slug, whatsapp_phone, plan, brand_color, timezone, trial_ends_at, subscription_status, logo_url, theme_preset) — Super Admin only
export async function updateTenantAdmin(
    tenantId: string,
    data: { 
        name?: string; 
        slug?: string; 
        whatsapp_phone?: string; 
        address?: string;
        plan?: string;
        brand_color?: string;
        timezone?: string;
        trial_ends_at?: string | null;
        subscription_status?: 'active' | 'suspended';
        logo_url?: string | null;
        theme_preset?: 'dark-modern' | 'spa-light';
    }
) {
    const supabase = await createClient();

    // Validate Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    // Build update payload
    const updatePayload: Record<string, any> = {};
    if (data.name?.trim()) updatePayload.name = data.name.trim();
    if (data.brand_color) updatePayload.brand_color = data.brand_color;
    if (data.plan) updatePayload.plan = data.plan;
    if (data.timezone) updatePayload.timezone = data.timezone;
    if (data.trial_ends_at !== undefined) updatePayload.trial_ends_at = data.trial_ends_at;
    if (data.subscription_status) updatePayload.subscription_status = data.subscription_status;
    if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url;

    if (data.slug?.trim()) {
        const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        // Check slug uniqueness
        const { data: existing } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', cleanSlug)
            .neq('id', tenantId)
            .single();
        if (existing) {
            return { error: `El slug "${cleanSlug}" ya está en uso por otro negocio.` };
        }
        updatePayload.slug = cleanSlug;
    }

    if (
        Object.keys(updatePayload).length === 0 && 
        data.whatsapp_phone === undefined && 
        data.address === undefined &&
        data.theme_preset === undefined
    ) {
        return { error: 'No hay cambios para guardar.' };
    }

    // Update tenant record
    if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase
            .from('tenants')
            .update(updatePayload)
            .eq('id', tenantId);
        if (error) return { error: `Error al actualizar tenant: ${error.message}` };
    }

    // Update settings JSONB (whatsapp_phone + address + theme_preset)
    if (data.whatsapp_phone !== undefined || data.address !== undefined || data.theme_preset !== undefined) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tenantId)
            .single();

        const currentSettings = (tenant?.settings as Record<string, any>) || {};
        const newSettings = { ...currentSettings };

        if (data.whatsapp_phone !== undefined) {
            const phone = data.whatsapp_phone.replace(/\D/g, '');
            newSettings.whatsapp_phone = phone || null;
        }
        if (data.address !== undefined) {
            newSettings.address = data.address.trim() || null;
        }
        if (data.theme_preset !== undefined) {
            newSettings.theme_preset = data.theme_preset;
        }

        const { error } = await supabase
            .from('tenants')
            .update({ settings: newSettings })
            .eq('id', tenantId);
        if (error) return { error: `Error al actualizar configuración: ${error.message}` };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: 'Negocio actualizado correctamente.' };
}

// Get platform-wide stats with trends
export async function getPlatformStats() {
    const supabase = await createClient();

    // Current month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel execution of batch queries (Total: 3 queries instead of 13)
    const [tenantsRes, bookingsRes, transactionsRes, allBookingsRes] = await Promise.all([
        supabase.from('tenants').select('id, name, slug, plan, subscription_status'),
        supabase.from('bookings').select('created_at, tenant_id').gte('created_at', startOfLastMonth.toISOString()),
        supabase.from('transactions').select('total, created_at').gte('created_at', startOfLastMonth.toISOString()),
        supabase.from('bookings').select('tenant_id')
    ]);

    // Handle tenant metrics
    const tenantsList = tenantsRes.data || [];
    const totalTenants = tenantsList.length;
    const activeTenants = tenantsList.filter(t => t.subscription_status === 'active').length;
    const suspendedTenants = totalTenants - activeTenants;

    // Handle bookings metrics
    const bookingsList = bookingsRes.data || [];
    const monthlyBookings = bookingsList.filter(b => new Date(b.created_at) >= startOfMonth).length;
    const lastMonthBookings = bookingsList.filter(b => {
        const d = new Date(b.created_at);
        return d >= startOfLastMonth && d <= endOfLastMonth;
    }).length;

    // Handle revenue metrics
    const transactionsList = transactionsRes.data || [];
    const monthlyRevenue = transactionsList
        .filter(t => new Date(t.created_at) >= startOfMonth)
        .reduce((sum, t) => sum + (t.total || 0), 0);
    const lastMonthRevenue = transactionsList
        .filter(t => {
            const d = new Date(t.created_at);
            return d >= startOfLastMonth && d <= endOfLastMonth;
        })
        .reduce((sum, t) => sum + (t.total || 0), 0);

    // Group last 7 days of bookings in-memory
    const last7Days: { day: string; count: number }[] = [];
    const countsMap: Record<string, number> = {};

    // Initialize map
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('es-MX', { weekday: 'short' });
        countsMap[key] = 0;
    }

    // Filter to last 7 days starting point
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const bookingsLast7Days = bookingsList.filter(b => new Date(b.created_at) >= sevenDaysAgo);

    // Populate map
    bookingsLast7Days.forEach(b => {
        const key = new Date(b.created_at).toLocaleDateString('es-MX', { weekday: 'short' });
        if (countsMap[key] !== undefined) {
            countsMap[key]++;
        }
    });

    // Build the ordered array
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('es-MX', { weekday: 'short' });
        last7Days.push({
            day: key,
            count: countsMap[key] || 0
        });
    }

    // Calculate trends
    const bookingTrend = lastMonthBookings ?
        Math.round(((monthlyBookings - lastMonthBookings) / lastMonthBookings) * 100) : 0;
    const revenueTrend = lastMonthRevenue ?
        Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    // Calculate average ticket
    const avgTicket = monthlyBookings ? Math.round(monthlyRevenue / monthlyBookings) : 0;

    // Group all-time bookings per tenant
    const tenantBookingsMap: Record<string, number> = {};
    const allBookingsList = allBookingsRes.data || [];
    allBookingsList.forEach(b => {
        if (b.tenant_id) {
            tenantBookingsMap[b.tenant_id] = (tenantBookingsMap[b.tenant_id] || 0) + 1;
        }
    });

    const rankings = tenantsList.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan || 'trial',
        subscription_status: t.subscription_status,
        bookingsCount: tenantBookingsMap[t.id] || 0
    })).sort((a, b) => b.bookingsCount - a.bookingsCount);

    return {
        totalTenants,
        activeTenants,
        suspendedTenants,
        monthlyBookings,
        monthlyRevenue,
        bookingTrend,
        revenueTrend,
        last7Days,
        avgTicket,
        rankings
    };
}

// --- SHOWCASE DATA: Seed demo barbers with schedules ---
async function seedShowcaseData(tenantId: string, slug: string, numBarbers: number) {
    const adminSupabase = createAdminClient();
    const barberNames = ['Carlos', 'Miguel', 'Diego', 'Andrés', 'Luis'];
    const createdBarbers: string[] = [];

    try {
        for (let i = 0; i < Math.min(numBarbers, 5); i++) {
            const email = `barbero${i + 1}-${slug}@demo.agendabarber.app`;
            const displayName = `${barberNames[i]} (Demo)`;

            // Create auth user via admin API
            const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
                email,
                password: `demo-${slug}-${Date.now()}`, // Random password (not used)
                email_confirm: true, // Skip email verification
                user_metadata: { full_name: displayName }
            });

            if (authError) {
                console.error(`[SHOWCASE] Error creating barber ${i + 1}:`, authError.message);
                continue;
            }

            if (!authUser.user) continue;

            // Update profile to link to tenant as staff
            const { error: profileError } = await adminSupabase
                .from('profiles')
                .update({
                    tenant_id: tenantId,
                    role: 'staff',
                    full_name: displayName,
                    is_active_barber: true,
                    is_calendar_visible: true,
                })
                .eq('id', authUser.user.id);

            if (profileError) {
                console.error(`[SHOWCASE] Profile update error for barber ${i + 1}:`, profileError.message);
                continue;
            }

            createdBarbers.push(authUser.user.id);
        }

        // Seed schedules for all created barbers
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const scheduleRows = createdBarbers.flatMap(barberId =>
            days.map(day => ({
                staff_id: barberId,
                tenant_id: tenantId,
                day,
                start_time: day === 'saturday' ? '10:00' : '10:00',
                end_time: day === 'saturday' ? '15:00' : '20:00',
                is_active: true,
            }))
        );

        if (scheduleRows.length > 0) {
            const { error: schedError } = await adminSupabase
                .from('staff_schedules')
                .insert(scheduleRows);

            if (schedError) {
                console.error('[SHOWCASE] Schedule insert error:', schedError.message);
                return { error: schedError.message };
            }
        }

        console.log(`[SHOWCASE] Created ${createdBarbers.length} demo barbers for tenant ${slug}`);
        return { success: true, count: createdBarbers.length };

    } catch (err) {
        console.error('[SHOWCASE] Unexpected error:', err);
        return { error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}
