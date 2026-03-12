-- =====================================================
-- MIGRATION: 20260312_add_metadata_to_services
-- Description: Adds a metadata JSONB column to the services table
-- to store dynamic pricing notes natively provided by the AI importer
-- =====================================================

BEGIN;

-- Add metadata column
ALTER TABLE services ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload the schema cache so the API recognizes the new column immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
