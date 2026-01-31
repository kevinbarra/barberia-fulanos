-- Migration: Financial Dashboard RPCs (Refactor Phase 2)
-- replaces "ghost" functions with versioned, immutable logic
-- ============================================================================

-- DROP Legacy Functions (Cleanup)
DROP FUNCTION IF EXISTS get_financial_dashboard(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_financial_dashboard(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_revenue_by_weekday(UUID, INT);

-- 1. get_financial_metrics
-- Returns: Financial KPIs matching the Frontend Interface
-- Logic: Uses price_at_booking (Immutable) -> service.price (Fallback)
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
    v_total_revenue DECIMAL(10,2);
    v_total_bookings INT;
    v_avg_ticket DECIMAL(10,2);
    v_unique_clients INT;
    -- Placeholders for comparison (Phase 3)
    v_previous_revenue DECIMAL(10,2) := 0; 
    v_growth_rate DECIMAL(10,2) := 0;
BEGIN
    SELECT 
        COALESCE(SUM(COALESCE(b.price_at_booking, s.price)), 0),
        COUNT(*),
        COUNT(DISTINCT b.client_id)
    INTO 
        v_total_revenue,
        v_total_bookings,
        v_unique_clients
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.tenant_id = p_tenant_id
    AND b.status = 'completed' -- Only REAL money
    AND b.start_time::DATE >= p_start_date
    AND b.start_time::DATE <= p_end_date;

    -- Calculate Average Ticket
    IF v_total_bookings > 0 THEN
        v_avg_ticket := ROUND(v_total_revenue / v_total_bookings, 2);
    ELSE
        v_avg_ticket := 0;
    END IF;

    RETURN jsonb_build_object(
        'total_revenue', v_total_revenue,
        'total_transactions', v_total_bookings,
        'avg_transaction_value', v_avg_ticket,
        'unique_clients', v_unique_clients,
        'previous_revenue', v_previous_revenue,
        'growth_rate', v_growth_rate
    );
END;
$$;

-- 2. get_revenue_by_day (Requested New Feature)
-- Returns: Daily breakdown for Line Charts
CREATE OR REPLACE FUNCTION get_revenue_by_day(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    day DATE,
    revenue DECIMAL(10,2),
    bookings INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::DATE as metric_day,
        COALESCE(SUM(COALESCE(b.price_at_booking, s.price)), 0) as daily_revenue,
        COUNT(*)::INT as daily_bookings
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.tenant_id = p_tenant_id
    AND b.status = 'completed'
    AND b.start_time::DATE >= p_start_date
    AND b.start_time::DATE <= p_end_date
    GROUP BY metric_day
    ORDER BY metric_day ASC;
END;
$$;

-- 3. get_revenue_by_weekday (Fixing Existing Chart)
-- Returns: Aggregated revenue by Day of Week (0=Sunday, 6=Saturday)
-- Standardizes input: p_months_back
CREATE OR REPLACE FUNCTION get_revenue_by_weekday(
    p_tenant_id UUID,
    p_months_back INT DEFAULT 3
)
RETURNS TABLE (
    weekday TEXT,
    avg_revenue DECIMAL(10,2),
    total_transactions INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
BEGIN
    v_start_date := (NOW() - (p_months_back || ' month')::INTERVAL)::DATE;

    RETURN QUERY
    SELECT 
        TRIM(TO_CHAR(b.start_time, 'Day')) as day_name, -- Postgres 'Day' returns padded string
        ROUND(AVG(daily_sum), 2) as avg_rev,
        SUM(daily_count)::INT as total_tx
    FROM (
        -- Inner query to sum by specific date first
        SELECT 
            b.start_time::DATE as d_date,
            COALESCE(SUM(COALESCE(b.price_at_booking, s.price)), 0) as daily_sum,
            COUNT(*) as daily_count,
            b.start_time
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        WHERE b.tenant_id = p_tenant_id
        AND b.status = 'completed'
        AND b.start_time::DATE >= v_start_date
        GROUP BY b.start_time::DATE, b.start_time
    ) sub
    GROUP BY day_name, EXTRACT(DOW FROM sub.start_time)
    ORDER BY EXTRACT(DOW FROM sub.start_time);
END;
$$;
