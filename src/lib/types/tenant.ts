// Tenant Settings Type
export interface TenantSettings {
    guest_checkout_enabled?: boolean;
    // Add future settings here
}

// Tenant Type
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color: string | null;
    subscription_status: 'active' | 'suspended' | 'trial';
    plan: 'trial' | 'basic' | 'pro' | 'enterprise' | null;
    timezone: string | null;
    trial_ends_at: string | null;
    kiosk_pin: string | null;
    is_booking_enabled: boolean;
    settings: TenantSettings | null;
    created_at: string;
}

// Helper to get setting with default value
export function getTenantSetting<K extends keyof TenantSettings>(
    tenant: Pick<Tenant, 'settings'>,
    key: K,
    defaultValue: NonNullable<TenantSettings[K]>
): NonNullable<TenantSettings[K]> {
    if (!tenant.settings) return defaultValue;
    const value = tenant.settings[key];
    return value !== undefined ? value : defaultValue;
}
