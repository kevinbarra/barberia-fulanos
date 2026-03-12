-- =====================================================
-- MIGRATION: 20260312_salon_mode_schema
-- Description: Structural evolution for Salon Mode
-- 1. service_categories table
-- 2. staff_services bridge table
-- 3. services table normalization (category -> category_id)
-- 4. transactions table enhancement (tax, extra_charges)
-- 5. Data backfill
-- =====================================================

BEGIN;

-- 1. Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_service_categories_tenant_id ON service_categories(tenant_id);

-- 2. Enhance services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- 3. Create staff_services bridge table
CREATE TABLE IF NOT EXISTS staff_services (
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (staff_id, service_id)
);

-- Index for service lookups
CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id);

-- 4. Enhance transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_charges NUMERIC DEFAULT 0;

-- 5. DATA BACKFILL
-- 5.1 Create categories from existing service ribbons
INSERT INTO service_categories (tenant_id, name)
SELECT DISTINCT tenant_id, category 
FROM services 
WHERE category IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5.2 Link services to the new categories
UPDATE services s
SET category_id = sc.id
FROM service_categories sc
WHERE s.tenant_id = sc.tenant_id 
  AND s.category = sc.name
  AND s.category_id IS NULL;

-- 5.3 Backfill staff_services (All active staff to all services of their tenant)
-- This preserves 'everyone does everything' by default
INSERT INTO staff_services (staff_id, service_id)
SELECT p.id as staff_id, s.id as service_id
FROM profiles p
JOIN services s ON p.tenant_id = s.tenant_id
WHERE p.role IN ('owner', 'staff')
  AND p.is_active_barber = TRUE
ON CONFLICT DO NOTHING;

COMMIT;
