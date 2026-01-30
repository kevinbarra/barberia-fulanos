-- Migration: Add Price Snapshot columns for financial integrity
-- Run this in Supabase SQL Editor AFTER the double-booking constraint
-- ============================================================================

-- STEP 1: Add price_at_booking to bookings table
-- This stores the service price AT THE MOMENT the booking was created
-- Even if the catalog price changes later, this value remains immutable
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS price_at_booking DECIMAL(10,2) DEFAULT NULL;

-- STEP 2: Add service_name_at_booking for historical reference
-- If the service is renamed or deleted, we still know what was booked
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_name_at_booking TEXT DEFAULT NULL;

-- STEP 3: Add comment for documentation
COMMENT ON COLUMN bookings.price_at_booking IS 'Immutable snapshot of service price at booking creation time. Used for financial reports.';
COMMENT ON COLUMN bookings.service_name_at_booking IS 'Immutable snapshot of service name at booking creation time. Historical reference.';

-- ============================================================================
-- STEP 4: Backfill existing bookings with current service prices
-- CAUTION: This is a one-time operation. Run only once after adding columns.
-- This will set prices based on CURRENT catalog prices, which may not be
-- historically accurate. Future bookings will have correct snapshots.
-- ============================================================================

UPDATE bookings b
SET 
    price_at_booking = s.price,
    service_name_at_booking = s.name
FROM services s
WHERE b.service_id = s.id
AND b.price_at_booking IS NULL
AND b.service_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT id, service_id, price_at_booking, service_name_at_booking 
-- FROM bookings 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- ALTER TABLE bookings DROP COLUMN IF EXISTS price_at_booking;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS service_name_at_booking;

-- Done! 🎉
-- Now all new bookings will capture the price at creation time.
-- Reports should read from price_at_booking, NOT from services.price
