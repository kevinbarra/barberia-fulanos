import SaaSLandingPage from "@/components/marketing/SaaSLandingPage";

/**
 * Root page — serves the static SaaS Landing Page.
 * Subdomain tenant redirects are handled immediately at the Edge Middleware level.
 * This allows this page to be compiled statically (SSG) for instant loads.
 */
export default function HomePage() {
  return <SaaSLandingPage />;
}