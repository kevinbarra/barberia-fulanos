# 🛠️ BITÁCORA DE PROYECTO & DEUDA TÉCNICA

> **INSTRUCCIONES PARA LA IA (IMPORTANTE):**
> 1. Este archivo es la "Conciencia" del proyecto. Léelo antes de cambios mayores.
> 2. **NO BORRES** tareas completadas. Márcalas como `[x]` y agrega la fecha/commit.
> 3. Usa esto para rastrear refactorizaciones complejas que no se pueden hacer en un solo sprint.

---

## 🚨 Prioridad Alta (Seguridad & Core)

- [ ] **Refactorizar Permisos de KioskMode (RBAC):**
    - *Contexto:* Actualmente usamos `MASTER_ADMIN_EMAIL` en `constants.ts` para validar acceso al modo Kiosco y Gastos.
    - *Objetivo:* Migrar a un sistema de permisos real en la tabla `profiles` (ej. columna `can_manage_kiosk` o tabla `permissions`).
    - *Ubicación:* `src/components/admin/KioskModeProvider.tsx`, `src/app/admin/expenses/actions.ts`.

---

## 🚜 Refactorización (Mantenimiento)

- [x] **Centralizar Constantes (Fase 1 - Timezone & Emails):**
    - *Detalle:* Se movieron `DEFAULT_TIMEZONE`, `MASTER_ADMIN_EMAIL` y `SUPPORT_EMAIL` a `src/lib/constants.ts`.
    - *Estado:* Completado el 2024-12-15. Commit: `refactor(config): centralize domain, timezone, and admin emails into constants`

- [x] **Centralizar Dominio (Fase 2 - Auth + UI + Emails):**
    - *Detalle:* Reemplazar TODOS los strings hardcodeados de `agendabarber.pro` por constantes de `src/lib/constants.ts`.
    - *Archivos refactorizados:* 
      - Auth/Routing: middleware.ts, server.ts, login/page.tsx, login/actions.ts, auth/callback/route.ts, admin/page.tsx, admin/layout.tsx, app/page.tsx
      - Emails: lib/email.ts (4 senders + 1 link)
      - UI: SelectAccountClient.tsx, select-account/page.tsx, TenantSuspendedScreen.tsx, NoTenantFallback.tsx
    - *Estado:* Completado el 2024-12-15. Commits: `refactor(core): replace hardcoded domain...` + `refactor(ui): finalize domain centralization...`

- [ ] **Configuración de Moneda por Tenant:**
    - *Detalle:* El símbolo `$` está hardcodeado en ~50 componentes UI.
    - *Objetivo:* Agregar `currency_symbol` a la tabla `tenants` y propagarlo via context.
    - *Estado:* Pendiente (Prioridad baja).

---

## 📱 UI/UX

- [x] **Mobile Experience Polish:**
    - *Detalle:* Se arregló el z-index del botón sticky en reservas y el tamaño de botones en POS.
    - *Estado:* Completado el 2024-12-15. Commit: `style(ui): improve mobile UX with sticky booking button and larger touch targets`

- [x] **Calendario Dinámico:**
    - *Detalle:* El calendario admin ahora muestra horas según horarios reales de barberos.
    - *Estado:* Completado. Commit: `feat(calendar): implement dynamic grid hours based on real staff schedules`

---

## 🔐 Seguridad

- [x] **Auth + Role + Tenant Validation en Server Actions:**
    - *Detalle:* Se agregó validación de 3 capas (`validateAdminAccess`) en `services/`, `schedule/`, `team/` actions.
    - *Estado:* Completado el 2024-12-15. Commit: `fix(security): implement strict auth, role, and tenant checks on critical server actions`

---

## 📋 Notas de Arquitectura

### Constantes Centralizadas (`src/lib/constants.ts`)
```
ROOT_DOMAIN          - Dominio base (white-label)
DEFAULT_TIMEZONE     - Zona horaria por defecto
MASTER_ADMIN_EMAIL   - Email para feature gates (temporal)
SUPPORT_EMAIL        - Email de soporte
COOKIE_DOMAIN        - Dominio para cookies cross-subdomain
```

### Funciones Helper en Constants
- `buildSubdomainUrl(slug, path)` - Construye URLs de tenant
- `isRootDomain(hostname)` - Detecta dominio raíz vs subdomain
- `extractTenantSlug(hostname)` - Extrae slug de tenant del hostname
