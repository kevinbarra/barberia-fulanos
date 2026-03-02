-- ============================================================
-- MIGRACIÓN: Agile Checkout Atómico (Protección Anti-Duplicidad)
-- ============================================================
--
-- PROPÓSITO:
-- Resuelve la condición de carrera descubierta por la prueba E2E (Ataque de Duplicidad).
-- Si el Bot Cron y un Cajero Humano dan checkout al mismo milisegundo, la validación
-- lógica en JS permite que ambos creen la transacción, cobrando doble al cliente.
-- 
-- Esta función envoltura (wrapper) utiliza FOR UPDATE para bloquear concurrencia en
-- la base de datos hasta que la transacción se escriba y vincule exitosamente al `booking_id`.
--
-- EJECUTAR EN: Supabase SQL Editor
-- ENTORNO: test-lab-barber (Sandbox) Y posteriormente en Producción
-- ============================================================

CREATE OR REPLACE FUNCTION agile_checkout_atomic(
    p_booking_id UUID,
    p_client_id UUID,
    p_total NUMERIC,
    p_services JSONB,
    p_products JSONB,
    p_payment_method TEXT,
    p_barber_id UUID,
    p_points_redeemed INTEGER,
    p_reward_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx_id UUID;
    v_existing UUID;
BEGIN
    -- 1. BLOQUEO DE PROTECCIÓN CONTRA RACE CONDITIONS
    -- FOR UPDATE bloquea la lectura concurrente hasta que este transaction stack finalice.
    SELECT id INTO v_existing 
    FROM transactions 
    WHERE booking_id = p_booking_id 
    FOR UPDATE;
    
    IF v_existing IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_TRANSACTION: Booking % is already checked out (Transaction %).', p_booking_id, v_existing;
    END IF;

    -- 2. INVOCACIÓN A LA LÓGICA DE NEGOCIO ORIGINAL (Lealtad y Finanzas)
    SELECT * INTO v_tx_id FROM create_transaction_with_points(
        p_client_id := p_client_id,
        p_total := p_total,
        p_services := p_services,
        p_products := p_products,
        p_payment_method := p_payment_method,
        p_barber_id := p_barber_id,
        p_points_redeemed := p_points_redeemed,
        p_reward_id := p_reward_id
    );

    -- 3. VINCULACIÓN ATÓMICA
    -- La transacción nace e inmediatamente pertenece a la cita.
    UPDATE transactions 
    SET booking_id = p_booking_id 
    WHERE id = v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION agile_checkout_atomic(UUID, UUID, NUMERIC, JSONB, JSONB, TEXT, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION agile_checkout_atomic(UUID, UUID, NUMERIC, JSONB, JSONB, TEXT, UUID, INTEGER, UUID) TO service_role;

-- OPCIONAL PERO RECOMENDADO: Constraint duro en esquema.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_booking 
ON transactions(booking_id) 
WHERE booking_id IS NOT NULL;
