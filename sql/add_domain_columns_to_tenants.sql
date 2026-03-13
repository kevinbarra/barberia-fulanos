-- =====================================================
-- MIGRATION: add_domain_columns_to_tenants
-- Description: Adds support for custom domains and domain configuration
-- =====================================================

BEGIN;

-- 1. Add custom_domain column
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- 2. Add domain_config column
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS domain_config JSONB DEFAULT '{}'::jsonb;

-- 3. Add index for custom domain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- 4. Add comments
COMMENT ON COLUMN tenants.custom_domain IS 'Qualified domain name (e.g., barberia.com) assigned to this tenant.';
COMMENT ON COLUMN tenants.domain_config IS 'Additional configuration for domain settings (SSL, DNS status, etc.).';

COMMIT;
