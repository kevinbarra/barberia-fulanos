import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <--- ESTO ABARCA TODO DENTRO DE SRC
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;