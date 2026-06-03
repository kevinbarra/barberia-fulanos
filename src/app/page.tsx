import Link from "next/link";
import SaaSLandingPage from "@/components/marketing/SaaSLandingPage";
import { headers } from "next/headers";
import { GLOBAL_BRANDING } from "@/lib/constants";
import { redirect } from "next/navigation";

/**
 * Root page — serves either:
 * 1. SaaS Landing (root domain / localhost) — mostly static content
 * 2. Tenant Landing (subdomain) — dynamic, needs tenant slug
 * 
 * Note: headers() is required for tenant detection via x-tenant-slug.
 * The SaaSLandingPage itself is a Server Component with zero client JS
 * except for the ContactForm island.
 */
export default async function HomePage() {
  // Read tenant slug injected by middleware (only present on subdomains)
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  // Si NO hay tenant slug, mostrar SaaS landing (aplica para root domain y localhost)
  if (!tenantSlug) {
    return <SaaSLandingPage />;
  }

  // Si hay tenant slug, redirigir directamente al asistente de reservas del tenant
  const slug = tenantSlug;
  redirect(`/book/${slug}`);
}