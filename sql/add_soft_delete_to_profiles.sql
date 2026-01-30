-- =====================================================
-- MIGRATION: add_soft_delete_to_profiles
-- Description: Adds deleted_at column to profiles table
-- for soft delete (archive) functionality.
-- Run in: Supabase SQL Editor
-- =====================================================

-- 1. Add soft delete column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create partial index for efficient filtering of active clients
-- This index only includes rows where deleted_at IS NULL (active clients)
CREATE INDEX IF NOT EXISTS idx_profiles_active 
ON profiles(tenant_id, role) 
WHERE deleted_at IS NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN profiles.deleted_at IS 
'Timestamp when client was archived (soft delete). NULL = active client. 
Used to hide clients from searches while preserving booking/financial history.';

-- =====================================================
-- VERIFICATION QUERY (run after migration)
-- =====================================================

-- Check column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'deleted_at';

-- Check index was created:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles' AND indexname = 'idx_profiles_active';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- DROP INDEX IF EXISTS idx_profiles_active;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS deleted_at;
