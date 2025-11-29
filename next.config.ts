import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Permite todos los proyectos de Supabase
      },
    ],
  },
};

export default nextConfig;