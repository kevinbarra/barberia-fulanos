import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <--- ESTO ABARCA TODO DENTRO DE SRC
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic brand color using CSS variable (injected per-tenant)
        brand: {
          DEFAULT: 'var(--brand-color)',
          foreground: '#ffffff',
          muted: 'color-mix(in srgb, var(--brand-color) 15%, white)',
        }
      }
    },
  },
  plugins: [],
};
export default config;