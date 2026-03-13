-- Migration: Update get_financial_metrics for Payment Engine Phase 30 (V3 Robust)
-- Refactors the financial KPIs to handle legacy bookings (NULL total_price) gracefully.

CREATE OR REPLACE FUNCTION get_financial_metrics(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_sales DECIMAL(10,2);
    v_total_collected DECIMAL(10,2);
    v_total_pending DECIMAL(10,2);
    v_total_transactions INT;
    v_unique_clients INT;
    v_avg_ticket DECIMAL(10,2);
    v_payment_methods JSONB;
BEGIN
    -- 1. Main Metrics from Bookings
    -- Fallback order: total_price -> price_at_booking (if total_price is NULL for legacy bookings)
    SELECT 
        COALESCE(SUM(COALESCE(b.total_price, b.price_at_booking)), 0),
        COALESCE(SUM(b.paid_amount), 0),
        COALESCE(SUM(GREATEST(0, COALESCE(b.total_price, b.price_at_booking) - COALESCE(b.paid_amount, 0))), 0),
        COUNT(*),
        COUNT(DISTINCT b.customer_id)
    INTO 
        v_total_sales,
        v_total_collected,
        v_total_pending,
        v_total_transactions,
        v_unique_clients
    FROM bookings b
    WHERE b.tenant_id = p_tenant_id
    AND b.status IN ('completed', 'confirmed')
    AND b.start_time::DATE >= p_start_date
    AND b.start_time::DATE <= p_end_date;

    -- 2. Average Ticket Calculation
    IF v_total_transactions > 0 THEN
        v_avg_ticket := ROUND(v_total_sales / v_total_transactions, 2);
    ELSE
        v_avg_ticket := 0;
    END IF;

    -- 3. Payment Methods Breakdown
    WITH method_summary AS (
        -- Digital income
        SELECT 
            'Digital (MP)' as method,
            COALESCE(SUM(paid_amount), 0) as amount
        FROM bookings
        WHERE tenant_id = p_tenant_id
        AND start_time::DATE >= p_start_date
        AND start_time::DATE <= p_end_date
        AND paid_amount > 0
        
        UNION ALL
        
        -- POS income
        SELECT 
            CASE 
                WHEN payment_method = 'cash' THEN 'Efectivo'
                WHEN payment_method = 'card' THEN 'Tarjeta (POS)'
                WHEN payment_method = 'transfer' THEN 'Transferencia'
                ELSE payment_method 
            END as method,
            COALESCE(SUM(amount), 0) as amount
        FROM transactions
        WHERE tenant_id = p_tenant_id
        AND created_at::DATE >= p_start_date
        AND created_at::DATE <= p_end_date
        GROUP BY method
    )
    SELECT jsonb_agg(jsonb_build_object('method', method, 'amount', amount))
    INTO v_payment_methods
    FROM method_summary
    WHERE amount > 0;

    RETURN jsonb_build_object(
        'total_revenue', v_total_sales,
        'total_collected', v_total_collected,
        'total_pending', v_total_pending,
        'total_transactions', v_total_transactions,
        'avg_transaction_value', v_avg_ticket,
        'unique_clients', v_unique_clients,
        'payment_methods', COALESCE(v_payment_methods, '[]'::jsonb),
        'growth_rate', 0
    );
END;
$$;
