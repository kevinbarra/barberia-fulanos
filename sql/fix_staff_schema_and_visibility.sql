-- =====================================================
-- MIGRATION: fix_staff_schema_and_visibility
-- Description: 
-- 1. Creates missing staff_skills table (fixes 42P01 error)
-- 2. Backfills visibility flags for existing staff
-- =====================================================

BEGIN;

-- 1. Create missing staff_skills table
CREATE TABLE IF NOT EXISTS staff_skills (
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (staff_id, service_id)
);

-- Index for service lookups
CREATE INDEX IF NOT EXISTS idx_staff_skills_service_id ON staff_skills(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_skills_tenant_id ON staff_skills(tenant_id);

-- 2. Backfill is_active_barber and is_calendar_visible
-- If they are NULL, they should be TRUE by default for owner and staff roles
UPDATE profiles 
SET 
  is_active_barber = COALESCE(is_active_barber, TRUE),
  is_calendar_visible = COALESCE(is_calendar_visible, TRUE)
WHERE role IN ('owner', 'staff')
  AND (is_active_barber IS NULL OR is_calendar_visible IS NULL);

-- 3. Backfill staff_skills from staff_services (backward compatibility)
INSERT INTO staff_skills (staff_id, service_id, tenant_id)
SELECT p.id, ss.service_id, p.tenant_id
FROM profiles p
JOIN staff_services ss ON p.id = ss.staff_id
ON CONFLICT DO NOTHING;

-- 4. Initial seed for staff_skills if empty (everyone does everything)
-- Only for those who have NO skills yet
INSERT INTO staff_skills (staff_id, service_id, tenant_id)
SELECT p.id, s.id, p.tenant_id
FROM profiles p
JOIN services s ON p.tenant_id = s.tenant_id
WHERE p.role IN ('owner', 'staff')
  AND p.is_active_barber = TRUE
  AND NOT EXISTS (SELECT 1 FROM staff_skills WHERE staff_id = p.id)
ON CONFLICT DO NOTHING;

COMMIT;
