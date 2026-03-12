-- =====================================================
-- MIGRATION: Phase 3 - Financial Logic Evolution
-- Description: Updates checkout RPCs to handle extra_charges and tax_amount
-- =====================================================

-- 1. Update create_transaction_with_points
-- We use SECURITY DEFINER to bypass RLS for POS operations
CREATE OR REPLACE FUNCTION create_transaction_with_points(
    p_client_id UUID,
    p_total NUMERIC,
    p_services JSONB,
    p_products JSONB,
    p_payment_method TEXT,
    p_barber_id UUID,
    p_points_redeemed INTEGER DEFAULT 0,
    p_reward_id UUID DEFAULT NULL,
    p_extra_charges NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx_id UUID;
    v_points_earned INTEGER;
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from barber profile
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_barber_id;

    -- Loyalty Logic: 1 point per 10 pesos (total amount excluding tax?)
    -- Usually salons reward on the net total. Let's use the full total for now 
    -- unless specified. 
    v_points_earned := FLOOR(p_total / 10);

    -- Insert Transaction with the new Salon Mode columns
    INSERT INTO transactions (
        client_id,
        tenant_id,
        total_amount,
        payment_method,
        barber_id,
        points_earned,
        points_redeemed,
        reward_id,
        extra_charges,
        tax_amount,
        services,
        products
    ) VALUES (
        p_client_id,
        v_tenant_id,
        p_total,
        p_payment_method,
        p_barber_id,
        v_points_earned,
        p_points_redeemed,
        p_reward_id,
        p_extra_charges,
        p_tax_amount,
        p_services,
        p_products
    ) RETURNING id INTO v_tx_id;

    -- Note: If we had a running loyalty_points balance in profiles, 
    -- we would update it here. But based on getClientPoints, 
    -- it's calculated on demand from transaction history.

    RETURN v_tx_id;
END;
$$;

-- 2. Update agile_checkout_atomic
-- This function wraps the transaction creation with a FOR UPDATE lock
-- to prevent duplicate checkouts for the same booking.
CREATE OR REPLACE FUNCTION agile_checkout_atomic(
    p_booking_id UUID,
    p_client_id UUID,
    p_total NUMERIC,
    p_services JSONB,
    p_products JSONB,
    p_payment_method TEXT,
    p_barber_id UUID,
    p_points_redeemed INTEGER,
    p_reward_id UUID,
    p_extra_charges NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx_id UUID;
    v_existing UUID;
BEGIN
    -- 1. PROTECCIÓN CONTRA RACE CONDITIONS
    -- Bloqueamos el booking para esta operación
    SELECT id INTO v_existing 
    FROM transactions 
    WHERE booking_id = p_booking_id 
    FOR UPDATE;
    
    IF v_existing IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_TRANSACTION: Booking % is already checked out (Transaction %).', p_booking_id, v_existing;
    END IF;

    -- 2. INVOCACIÓN A LA LÓGICA DE NEGOCIO
    -- Llamamos a la función que crea la transacción y maneja lealtad
    SELECT create_transaction_with_points(
        p_client_id := p_client_id,
        p_total := p_total,
        p_services := p_services,
        p_products := p_products,
        p_payment_method := p_payment_method,
        p_barber_id := p_barber_id,
        p_points_redeemed := p_points_redeemed,
        p_reward_id := p_reward_id,
        p_extra_charges := p_extra_charges,
        p_tax_amount := p_tax_amount
    ) INTO v_tx_id;

    -- 3. VINCULACIÓN ATÓMICA FINAL
    UPDATE transactions 
    SET booking_id = p_booking_id 
    WHERE id = v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION create_transaction_with_points(UUID, NUMERIC, JSONB, JSONB, TEXT, UUID, INTEGER, UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION agile_checkout_atomic(UUID, UUID, NUMERIC, JSONB, JSONB, TEXT, UUID, INTEGER, UUID, NUMERIC, NUMERIC) TO authenticated;
