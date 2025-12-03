import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Iniciamos el puente de compatibilidad
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Arquitectura de Configuración Plana (Flat Config)
const eslintConfig = [
  // 1. Extendemos la configuración oficial de Next.js (Core Web Vitals)
  ...compat.extends("next/core-web-vitals"),

  // 2. Extendemos la configuración de TypeScript (Opcional pero recomendada)
  ...compat.extends("next/typescript"),

  // 3. Reglas Personalizadas (Si las tuvieras)
  {
    // files: ["**/*.ts", "**/*.tsx"], // Opcional: limitar a TS
    // rules: { ... }
  },

  // 4. Ignorar archivos globales
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  }
];

export default eslintConfig;