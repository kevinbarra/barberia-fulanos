/**
 * Central Configuration Constants
 * 
 * This file serves as the single source of truth for all environment-dependent
 * configuration values. Import from here instead of hardcoding values.
 * 
 * For white-label deployments, override these via environment variables.
 */

// ==================== DOMAIN CONFIGURATION ====================
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'agendabarber.pro';
export const APP_HOST = process.env.NEXT_PUBLIC_APP_URL || `https://${ROOT_DOMAIN}`;

// Cookie domain for cross-subdomain auth (must include leading dot)
export const COOKIE_DOMAIN = process.env.NODE_ENV === 'production'
    ? `.${ROOT_DOMAIN}`
    : undefined;

// Reserved subdomains that don't correspond to tenants
export const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app'];

// ==================== LOCALIZATION ====================
export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'America/Mexico_City';
export const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'es-MX';

// ==================== ADMINISTRATIVE EMAILS ====================
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || `soporte@${ROOT_DOMAIN}`;
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'kevinbarra2001@gmail.com';
export const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || `contacto@${ROOT_DOMAIN}`;

// ==================== FEATURE FLAGS / GATES ====================
// TODO: Migrate this logic to role-based permissions in the profiles table
// This email-based gate is temporary and should be replaced with a proper
// feature flag system or super_admin role check.
export const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'admin@agendabarber.pro';

// Platform-level WhatsApp for sales/support (used in SaaS landing & suspended screen)
export const PLATFORM_WHATSAPP = process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP || '522291589149';

// ==================== HELPER FUNCTIONS ====================
/**
 * Build a full subdomain URL
 */
export function buildSubdomainUrl(slug: string, path: string = ''): string {
    return `https://${slug}.${ROOT_DOMAIN}${path}`;
}

/**
 * Check if a hostname is the root domain (not a tenant subdomain)
 */
export function isRootDomain(hostname: string): boolean {
    return hostname === ROOT_DOMAIN ||
        hostname === `www.${ROOT_DOMAIN}` ||
        hostname.includes('localhost') ||
        hostname.includes('127.0.0.1') ||
        hostname.endsWith('.vercel.app');
}

/**
 * Extract tenant slug from hostname
 */
export function extractTenantSlug(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) return null;
    if (hostname.endsWith('.vercel.app')) return null;

    const parts = hostname.replace(':443', '').replace(':80', '').split('.');
    if (parts.length >= 3) {
        const subdomain = parts[0];
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) return subdomain;
    }
    return null;
}
