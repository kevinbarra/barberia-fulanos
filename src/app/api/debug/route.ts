import { NextResponse } from 'next/server';
import { extractTenantSlug } from '@/lib/constants';

export async function GET(request: Request) {
    const hostname = request.headers.get('host') || '';
    const tenantSlug = extractTenantSlug(hostname);
    const url = new URL(request.url);
    const pathname = url.pathname;

    return NextResponse.json({
        hostname,
        tenantSlug,
        pathname,
        headers: Object.fromEntries(request.headers),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
            NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN
        }
    });
}
