'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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
    const showcaseMode = formData.get('showcase_mode') === 'true';
    const showcaseBarbers = parseInt(formData.get('showcase_barbers') as string) || 2;

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
        p_timezone: timezone
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

    // 4. SHOWCASE MODE: Seed demo barbers with schedules
    if (showcaseMode && result.tenant_id) {
        const seedResult = await seedShowcaseData(result.tenant_id, slug, showcaseBarbers);
        if (seedResult.error) {
            console.error('[SHOWCASE] Seed error:', seedResult.error);
            // Don't fail the whole creation — tenant is already created
        }
    }

    // 5. Éxito
    revalidatePath('/admin/platform');
    const modeLabel = demoMode ? ' (Modo Demo)' : '';
    const showcaseLabel = showcaseMode ? ` + ${showcaseBarbers} barberos demo` : '';
    return { success: true, message: (result.message || 'Tenant creado.') + modeLabel + showcaseLabel };
}


// Toggle tenant status (suspend/activate)
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

// Get platform-wide stats with trends
export async function getPlatformStats() {
    const supabase = await createClient();

    // Current month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total tenants
    const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

    // Active tenants
    const { count: activeTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

    // Suspended tenants
    const suspendedTenants = (totalTenants || 0) - (activeTenants || 0);

    // Current month bookings
    const { count: monthlyBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

    // Last month bookings (for trend)
    const { count: lastMonthBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

    // Current month revenue
    const { data: revenueData } = await supabase
        .from('transactions')
        .select('total')
        .gte('created_at', startOfMonth.toISOString());

    const monthlyRevenue = revenueData?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;

    // Last month revenue (for trend)
    const { data: lastRevenueData } = await supabase
        .from('transactions')
        .select('total')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

    const lastMonthRevenue = lastRevenueData?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;

    // Daily bookings for last 7 days (for chart)
    const last7Days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());

        last7Days.push({
            day: dayStart.toLocaleDateString('es-MX', { weekday: 'short' }),
            count: count || 0
        });
    }

    // Calculate trends
    const bookingTrend = lastMonthBookings ?
        Math.round(((monthlyBookings || 0) - lastMonthBookings) / lastMonthBookings * 100) : 0;
    const revenueTrend = lastMonthRevenue ?
        Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

    return {
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        suspendedTenants,
        monthlyBookings: monthlyBookings || 0,
        monthlyRevenue,
        bookingTrend,
        revenueTrend,
        last7Days
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
