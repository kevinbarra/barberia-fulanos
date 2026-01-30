-- Migration: Double-Booking Prevention via SQL EXCLUSION Constraint
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Enable btree_gist extension (required for EXCLUSION with multiple types)
-- This extension allows combining equality checks with range overlap checks
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- STEP 2: Create a function that returns a time range from start_time and end_time
-- We'll use tstzrange (timestamp with timezone range)
-- This is cleaner than trying to use raw timestamps in the exclusion

-- STEP 3: Add EXCLUSION CONSTRAINT to prevent overlapping bookings
-- Rule: Two bookings for the same staff_id cannot have overlapping time ranges
-- Exception: Cancelled bookings are ignored (they don't block slots)

-- First, let's add the constraint with a partial index (only for non-cancelled bookings)
ALTER TABLE bookings 
ADD CONSTRAINT no_double_booking 
EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (status NOT IN ('cancelled', 'no_show'));

-- EXPLANATION:
-- - staff_id WITH = : The constraint applies when staff_id is EQUAL
-- - tstzrange(start_time, end_time, '[)') : Creates a time range [start, end)
--   - '[)' means: includes start, excludes end (so back-to-back bookings are OK)
-- - WITH && : The && operator checks for OVERLAP
-- - WHERE clause: Only enforces for active bookings (not cancelled/no_show)

-- ============================================================================
-- VERIFICATION TESTS (Run these to verify constraint works)
-- ============================================================================

-- TEST 1: Should FAIL (same staff, overlapping time)
-- INSERT INTO bookings (tenant_id, staff_id, start_time, end_time, status) 
-- VALUES (
--     'your-tenant-id', 
--     'your-staff-id', 
--     NOW(), 
--     NOW() + INTERVAL '30 minutes',
--     'confirmed'
-- );
-- INSERT INTO bookings (tenant_id, staff_id, start_time, end_time, status) 
-- VALUES (
--     'your-tenant-id', 
--     'your-staff-id', 
--     NOW() + INTERVAL '15 minutes',  -- OVERLAPS with previous!
--     NOW() + INTERVAL '45 minutes',
--     'confirmed'
-- );
-- Expected: ERROR: conflicting key value violates exclusion constraint "no_double_booking"

-- TEST 2: Should SUCCEED (same staff, but first is cancelled)
-- The cancelled booking should NOT block new bookings

-- TEST 3: Should SUCCEED (different staff, same time)
-- Different barbers can have concurrent appointments

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_double_booking;
-- DROP EXTENSION IF EXISTS btree_gist;

-- Done! 🎉
-- Now the database itself prevents double-bookings, not just JavaScript validation.
