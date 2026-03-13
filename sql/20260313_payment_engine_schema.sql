-- =====================================================
-- MIGRATION: 20260313_payment_engine_schema
-- Description: Database structure for Modular Payment Rules (Phase 26)
-- 1. Create booking_payment_status enum
-- 2. Add total_price, paid_amount, payment_status to bookings
-- 3. Initialize payment_rules in tenant_settings
-- 4. Secure paid_amount via trigger (Service Role Only)
-- =====================================================

BEGIN;

-- 1. Create payment status enum
DO $$ BEGIN
    CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'pending_payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add columns to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status booking_payment_status DEFAULT 'unpaid';

-- Add comments for documentation
COMMENT ON COLUMN bookings.total_price IS 'Projected total price including services, extras, and taxes at booking time.';
COMMENT ON COLUMN bookings.paid_amount IS 'Total amount already paid via prepayments or deposits. Restricted to Service Role.';
COMMENT ON COLUMN bookings.payment_status IS 'Tracks the financial lifecycle of the appointment.';

-- 3. Initialize payment_rules in tenant_settings
-- Default mode is 'Libre'
UPDATE tenants 
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb), 
    '{payment_rules}', 
    '{"mode": "Libre"}'::jsonb, 
    true
)
WHERE settings->'payment_rules' IS NULL;

-- 4. SECURITY: Protect paid_amount from unauthorized updates
-- Only service_role can modify paid_amount to prevent client-side or manual intervention
CREATE OR REPLACE FUNCTION check_paid_amount_security()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN
        -- Check if the current role is service_role
        -- In Supabase, service_role is the high-privilege key
        IF current_setting('role') != 'service_role' THEN
            RAISE EXCEPTION 'UNAUTHORIZED: paid_amount can only be modified by the system (service_role).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_paid_amount_security ON bookings;
CREATE TRIGGER tr_enforce_paid_amount_security
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_paid_amount_security();

COMMIT;
