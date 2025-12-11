import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ClientProfileForm from "@/components/client/ClientProfileForm";

const ROOT_DOMAIN = 'agendabarber.pro'
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app']

function extractTenantFromHostname(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null
    }
    if (hostname.endsWith('.vercel.app')) {
        return null
    }
    const parts = hostname.replace(':443', '').replace(':80', '').split('.')
    if (parts.length >= 3) {
        const subdomain = parts[0]
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) {
            return subdomain
        }
    }
    return null
}

export default async function ClientProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Get current subdomain tenant
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const currentSlug = extractTenantFromHostname(hostname);

    // Get user profile and current tenant info
    const [profileResult, tenantResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, avatar_url, email, phone, loyalty_points, created_at')
            .eq('id', user.id)
            .single(),
        currentSlug
            ? supabase.from('tenants').select('name').eq('slug', currentSlug).single()
            : Promise.resolve({ data: null })
    ]);

    const profile = profileResult.data;
    const currentTenantName = tenantResult.data?.name;

    return (
        <ClientProfileForm
            initialName={profile?.full_name || ''}
            initialAvatar={profile?.avatar_url}
            email={profile?.email || user.email || ''}
            phone={profile?.phone || ''}
            loyaltyPoints={profile?.loyalty_points || 0}
            memberSince={profile?.created_at || ''}
            tenantName={currentTenantName}
        />
    );
}