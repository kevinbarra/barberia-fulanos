import { createClient } from "@/utils/supabase/server";
import BookingWizard from "@/components/booking/BookingWizard";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: tenant } = await supabase
        .from("tenants")
        .select("name, logo_url")
        .eq("slug", slug)
        .single();

    if (!tenant) return { title: "Reservar Cita" };

    return {
        title: `${tenant.name} – Reservar Cita`,
        description: `Agenda tu cita en ${tenant.name}. Rápido, fácil y sin esperas.`,
        openGraph: {
            title: `${tenant.name} – Reservar Cita`,
            description: `Agenda tu cita en ${tenant.name}. Rápido, fácil y sin esperas.`,
            images: tenant.logo_url ? [{ url: tenant.logo_url, width: 512, height: 512, alt: tenant.name }] : [],
        },
    };
}

export default async function BookingPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Verificar autenticación (OPCIONAL/GUEST MODE)
    // Ya no redirigimos forzosamente. Permitimos acceso a invitados.
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Obtener datos del perfil si existe usuario
    let userData = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', user.id)
            .single();

        userData = {
            id: user.id,
            full_name: profile?.full_name || '',
            email: profile?.email || user.email || '',
            phone: profile?.phone || ''
        };
    }

    // 3. Datos del Negocio (include settings for guest checkout check)
    const { data: tenant } = await supabase
        .from("tenants")
        .select("*, settings")
        .eq("slug", slug)
        .single();
    if (!tenant) return notFound();

    // 4. Verificar que el tenant esté activo
    if (tenant.subscription_status !== 'active') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Servicio no disponible</h1>
                    <p className="text-gray-600">Este negocio no está aceptando reservas en este momento.</p>
                </div>
            </div>
        );
    }

    // 4.1 CHECK: Guest Checkout Setting
    // Default to true (enabled) if settings is null or key is missing
    const tenantSettings = tenant.settings as { guest_checkout_enabled?: boolean; whatsapp_phone?: string } | null;
    const isGuestCheckoutEnabled = tenantSettings?.guest_checkout_enabled !== false; // Default: true
    const whatsappPhone = tenantSettings?.whatsapp_phone || null;

    // If guest checkout is DISABLED and user is NOT logged in, redirect to login
    if (!isGuestCheckoutEnabled && !user) {
        redirect(`/login?next=/book/${slug}`);
    }

    // 5. Fetch services, staff, and schedules for this tenant
    const { data: services } = await supabase.from("services").select("*").eq("tenant_id", tenant.id).eq("is_active", true).order("name");
    const { data: staff } = await supabase.from("profiles").select("*").eq("tenant_id", tenant.id).neq("role", "customer").eq("is_active_barber", true).eq("is_calendar_visible", true);
    const { data: schedules } = await supabase.from("staff_schedules").select("*").eq("tenant_id", tenant.id).eq("is_active", true);

    return (
        <div
            style={{
                '--brand-color': tenant.brand_color || '#18181b',
            } as React.CSSProperties}
        >
            <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">

                {/* HEADER DE NAVEGACIÓN */}
                <div className="w-full max-w-md mb-6 flex items-center relative">
                    <Link href="/app" className="absolute left-0 p-2 bg-white rounded-full shadow-sm text-gray-600 hover:bg-gray-100">
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="w-full text-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reservando en</span>
                    </div>
                </div>

                {/* BRANDING */}
                <div className="bg-white w-full max-w-md rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
                    <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full mb-3 overflow-hidden relative border-4 border-white shadow-md">
                        {tenant.logo_url ? (
                            <Image src={tenant.logo_url} alt={tenant.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-300">
                                {tenant.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">{tenant.name}</h1>
                </div>

                {/* WIZARD */}
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <BookingWizard
                        services={services || []}
                        staff={staff || []}
                        schedules={schedules || []}
                        currentUser={userData}
                        whatsappPhone={whatsappPhone}
                        tenantName={tenant.name}
                    />
                </div>
            </div>
        </div>
    );
}