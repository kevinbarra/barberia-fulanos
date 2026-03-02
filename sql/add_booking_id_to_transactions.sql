-- Migration: Add booking_id column to transactions table
-- Purpose: Link transactions directly to the booking they finalize
-- This enables financial auditing: which appointment generated which transaction

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);

-- Backfill existing transactions from audit_log where possible
-- (The audit_log stores bookingId in metadata for POS_SALE entries)
-- This is a best-effort backfill; run manually if needed:
--
-- UPDATE transactions t
-- SET booking_id = (al.metadata->>'bookingId')::UUID
-- FROM audit_log al
-- WHERE al.entity = 'transactions'
--   AND al.entity_id = t.id::TEXT
--   AND al.metadata->>'type' = 'POS_SALE'
--   AND al.metadata->>'bookingId' IS NOT NULL
--   AND t.booking_id IS NULL;
