-- =====================================================
-- MIGRATION: reconcile_guest_on_signup
-- Description: Trigger to link orphan guest bookings 
-- to new user accounts and hydrate profile data
-- Run in: Supabase SQL Editor
-- =====================================================

-- Drop existing trigger/function if exists (for clean updates)
DROP TRIGGER IF EXISTS on_profile_created_reconcile_guest ON public.profiles;
DROP FUNCTION IF EXISTS reconcile_guest_bookings();

-- Create the reconciliation function
CREATE OR REPLACE FUNCTION reconcile_guest_bookings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to update bookings
AS $$
DECLARE
    v_guest_name TEXT;
    v_guest_phone TEXT;
    v_linked_count INT;
BEGIN
    -- Skip if no email (shouldn't happen, but safety check)
    IF NEW.email IS NULL THEN
        RETURN NEW;
    END IF;

    -- ==================================================
    -- 1. LINK ORPHAN BOOKINGS TO THIS NEW USER
    -- ==================================================
    -- Case-insensitive email match for mobile keyboard variations
    UPDATE bookings 
    SET customer_id = NEW.id
    WHERE LOWER(guest_email) = LOWER(NEW.email) 
      AND customer_id IS NULL;
    
    GET DIAGNOSTICS v_linked_count = ROW_COUNT;
    
    IF v_linked_count > 0 THEN
        RAISE NOTICE '[RECONCILE] Linked % orphan booking(s) to user %', v_linked_count, NEW.id;
    END IF;

    -- ==================================================
    -- 2. HYDRATE PROFILE FROM MOST RECENT BOOKING
    -- ==================================================
    -- Only if profile is missing name or phone
    IF NEW.full_name IS NULL OR NEW.phone IS NULL THEN
        -- Get guest data from most recent booking
        SELECT guest_name, guest_phone 
        INTO v_guest_name, v_guest_phone
        FROM bookings 
        WHERE LOWER(guest_email) = LOWER(NEW.email)
          AND (guest_name IS NOT NULL OR guest_phone IS NOT NULL)
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Update profile with guest data if found
        IF v_guest_name IS NOT NULL OR v_guest_phone IS NOT NULL THEN
            UPDATE profiles SET
                full_name = COALESCE(NEW.full_name, v_guest_name),
                phone = COALESCE(NEW.phone, v_guest_phone)
            WHERE id = NEW.id;
            
            RAISE NOTICE '[RECONCILE] Hydrated profile % with guest data: name=%, phone=%', 
                NEW.id, v_guest_name, v_guest_phone;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_reconcile_guest
AFTER INSERT ON public.profiles
FOR EACH ROW 
EXECUTE FUNCTION reconcile_guest_bookings();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION reconcile_guest_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_guest_bookings() TO service_role;

-- ==================================================
-- VERIFICATION QUERY (Run after migration)
-- ==================================================
-- Check if trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_profile_created_reconcile_guest';
