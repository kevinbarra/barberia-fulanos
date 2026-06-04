import { createClient } from "@/utils/supabase/server";
import BookingWizard from "@/components/booking/BookingWizard";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, User, MapPin, Phone, Award, Clock, Star, Gift, Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Suspense } from "react";
import { shiftColorHue, hexToRgba } from "@/lib/colors";

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
    const tenantSettings = tenant.settings as any; // Using any or casting to TenantSettings
    const isGuestCheckoutEnabled = tenantSettings?.guest_checkout_enabled !== false; // Default: true
    const whatsappPhone = tenantSettings?.whatsapp_phone || null;
    const tenantAddress = tenantSettings?.address || null;

    // If guest checkout is DISABLED and user is NOT logged in, redirect to login
    if (!isGuestCheckoutEnabled && !user) {
        redirect(`/login?next=/book/${slug}`);
    }

    // 5. Fetch services, staff, and schedules for this tenant
    // Fetch categories first to join with services (or select services with categories)
    const { data: services } = await supabase
        .from("services")
        .select("*, service_categories(*)")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("order", { ascending: true })
        .order("name");

    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url, phone, staff_category, role_alias, staff_services(service_id), staff_skills(service_id)")
        .eq("tenant_id", tenant.id)
        .neq("role", "customer")
        .eq("is_active_barber", true)
        .eq("is_calendar_visible", true);

    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

    // Transform services to include the category name and order from the relationship
    const transformedServices = services?.map(s => ({
        ...s,
        category: (s as any).service_categories?.name || s.category, // Fallback to old string if needed
        category_order: (s as any).service_categories?.order || 0,
        order: (s as any).order || 0
    })) || [];

    // Transform staff to include flat arrays of service_ids and skills
    const transformedStaff = staff?.map(p => ({
        ...p,
        services: (p as any).staff_services?.map((ss: any) => ss.service_id) || [],
        skills: (p as any).staff_skills?.map((ss: any) => ss.service_id) || []
    })) || [];

    const brandColor = tenant.brand_color || '#ea2707';
    const secondaryColor = shiftColorHue(brandColor, 40);
    const brandColor5 = hexToRgba(brandColor, 0.05);
    const brandColor10 = hexToRgba(brandColor, 0.10);
    const secondaryColor20 = hexToRgba(secondaryColor, 0.20);

    return (
        <div
            style={{
                '--brand-color': brandColor,
                '--brand-color-secondary': secondaryColor,
                '--brand-color-5': brandColor5,
                '--brand-color-10': brandColor10,
                '--brand-color-secondary-20': secondaryColor20,
            } as React.CSSProperties}
            className="relative min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-amber-500/30 selection:text-white"
        >
            {/* Background glowing auroras and grid */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div 
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-25"
                    style={{ backgroundColor: brandColor }}
                />
                <div 
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-15"
                    style={{ backgroundColor: secondaryColor }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px] opacity-80" />
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 min-h-screen flex flex-col items-center py-6 px-4 lg:py-12 max-w-6xl mx-auto justify-center">
                
                {/* MOBILE COMPACT HEADER (Visible on mobile/tablet, hidden on desktop) */}
                <div className="w-full max-w-md lg:hidden mb-6 flex justify-between items-center bg-zinc-900/90 backdrop-blur-xl p-3.5 rounded-[2rem] border border-zinc-800/80 shadow-2xl">
                    <div className="flex items-center gap-3 pl-1">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border-[2px] border-zinc-700 overflow-hidden relative flex-shrink-0 shadow-md">
                            {tenant.logo_url ? (
                                <Image src={tenant.logo_url} alt={tenant.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-400">
                                    {tenant.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Reservando en</span>
                            <span className="text-xs font-black text-white truncate max-w-[150px] leading-tight mt-1">{tenant.name}</span>
                        </div>
                    </div>
                    
                    <Link 
                        href="/app" 
                        className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl transition-all text-xs font-black shadow-lg active:scale-95"
                    >
                        <User size={13} className="text-zinc-900" />
                        <span>Mis Puntos 🏆</span>
                    </Link>
                </div>

                {/* RESPONSIVE LAYOUT GRID */}
                <div className="w-full flex flex-col lg:flex-row justify-center items-stretch gap-8">
                    
                    {/* LEFT PANEL: Branding & Loyalty Card (Desktop only, hidden on mobile) */}
                    <div className="hidden lg:flex flex-col w-[360px] bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] border border-zinc-800/80 p-8 justify-between shadow-2xl">
                        <div className="space-y-8">
                            {/* Brand Header */}
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto bg-zinc-800 rounded-full mb-4 overflow-hidden relative border-[3px] border-zinc-800 shadow-xl ring-2 ring-[var(--brand-color)]">
                                    {tenant.logo_url ? (
                                        <Image src={tenant.logo_url} alt={tenant.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-zinc-400">
                                            {tenant.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{tenant.name}</h1>
                                <span className="inline-block mt-2 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[var(--brand-color)]/10 text-[var(--brand-color)] border border-[var(--brand-color)]/25 shadow-sm">
                                    {tenantSettings?.business_type === 'salon' ? 'Salón de Belleza' : 'Barbería Premium'}
                                </span>
                            </div>

                            <hr className="border-zinc-800/50" />

                            {/* Details List */}
                            <div className="space-y-4">
                                {tenantAddress && (
                                    <div className="flex gap-3.5 items-start text-sm">
                                        <MapPin size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <span className="font-bold text-zinc-500 block text-[10px] uppercase tracking-wider">Ubicación</span>
                                            <span className="text-zinc-300 font-medium leading-relaxed">{tenantAddress}</span>
                                        </div>
                                    </div>
                                )}

                                {whatsappPhone && (
                                    <div className="flex gap-3.5 items-start text-sm">
                                        <Phone size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <span className="font-bold text-zinc-500 block text-[10px] uppercase tracking-wider">Contacto</span>
                                            <span className="text-zinc-300 font-medium">{whatsappPhone}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-zinc-800/50" />

                            {/* Loyalty Promo Card */}
                            <div className="bg-gradient-to-br from-amber-500/10 to-[var(--brand-color)]/5 rounded-3xl p-5 border border-amber-500/20 shadow-inner">
                                <div className="flex gap-3 items-start">
                                    <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center text-amber-400 shrink-0 shadow-sm border border-amber-500/10">
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-sm tracking-tight">Club de Recompensas</h3>
                                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">
                                            Gana el <strong className="text-amber-400 font-black">10% de tus servicios</strong> en puntos acumulables. ¡Canjéalos por cortes y productos gratis en el portal!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Portal Access Button */}
                        <div className="pt-6">
                            <Link 
                                href="/app" 
                                className="group flex items-center justify-center gap-2.5 w-full py-4 bg-zinc-800 hover:bg-zinc-750 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] border border-zinc-700/50 hover:border-zinc-600"
                            >
                                <User size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                <span>Ver mis Puntos / Cuenta</span>
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Booking Card */}
                    <div className="w-full max-w-md flex flex-col min-h-[550px] h-[650px] max-h-[85vh] lg:h-auto lg:max-h-none">
                        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-800/80 flex-1 flex flex-col justify-between min-h-0">
                            <Suspense fallback={
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="animate-spin text-amber-500" size={32} />
                                </div>
                            }>
                                <BookingWizard
                                    services={transformedServices}
                                    staff={transformedStaff}
                                    schedules={schedules || []}
                                    currentUser={userData}
                                    whatsappPhone={whatsappPhone}
                                    tenantName={tenant.name}
                                    businessType={tenantSettings?.business_type || 'barber'}
                                    paymentRules={tenantSettings?.payment_rules || { mode: 'Libre' }}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}