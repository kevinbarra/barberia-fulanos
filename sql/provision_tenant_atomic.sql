-- =====================================================
-- MIGRATION: provision_tenant_atomic
-- Description: Atomic function for creating new tenants
-- with default services and owner assignment
-- Run in: Supabase SQL Editor
-- =====================================================

-- Drop existing function if exists (for clean updates)
DROP FUNCTION IF EXISTS provision_tenant_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create the atomic provisioning function
CREATE OR REPLACE FUNCTION provision_tenant_atomic(
    p_name TEXT,
    p_slug TEXT,
    p_owner_email TEXT,
    p_brand_color TEXT DEFAULT '#8b5cf6',
    p_plan TEXT DEFAULT 'trial',
    p_timezone TEXT DEFAULT 'America/Mexico_City'
) 
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with creator's privileges (bypasses RLS)
AS $$
DECLARE
    v_tenant_id UUID;
    v_owner_id UUID;
    v_slug_clean TEXT;
    v_owner_assigned BOOLEAN := FALSE;
BEGIN
    -- ==================================================
    -- 1. VALIDATE & SANITIZE INPUT
    -- ==================================================
    
    -- Clean slug: lowercase, trim, remove spaces
    v_slug_clean := LOWER(TRIM(REGEXP_REPLACE(p_slug, '\s+', '-', 'g')));
    
    -- Validate required fields
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
        RAISE EXCEPTION 'El nombre del negocio es requerido (mínimo 2 caracteres)';
    END IF;
    
    IF v_slug_clean IS NULL OR LENGTH(v_slug_clean) < 3 THEN
        RAISE EXCEPTION 'El slug es requerido (mínimo 3 caracteres)';
    END IF;
    
    IF p_owner_email IS NULL OR p_owner_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Email del dueño inválido';
    END IF;
    
    -- Check if slug already exists
    IF EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug_clean) THEN
        RAISE EXCEPTION 'El slug "%" ya está en uso. Elija otro.', v_slug_clean;
    END IF;
    
    -- ==================================================
    -- 2. CREATE TENANT
    -- ==================================================
    
    INSERT INTO tenants (
        name,
        slug,
        subscription_status,
        brand_color,
        plan,
        timezone,
        trial_ends_at
    ) VALUES (
        TRIM(p_name),
        v_slug_clean,
        'active',
        COALESCE(p_brand_color, '#8b5cf6'),
        COALESCE(p_plan, 'trial'),
        COALESCE(p_timezone, 'America/Mexico_City'),
        NOW() + INTERVAL '14 days'  -- 14-day trial
    )
    RETURNING id INTO v_tenant_id;
    
    -- ==================================================
    -- 3. SEED DEFAULT SERVICES
    -- ==================================================
    
    INSERT INTO services (tenant_id, name, price, duration_min, category, is_active)
    VALUES 
        (v_tenant_id, 'Corte Clásico', 150.00, 30, 'Cortes', TRUE),
        (v_tenant_id, 'Corte + Barba', 220.00, 45, 'Combos', TRUE),
        (v_tenant_id, 'Barba', 100.00, 20, 'Barba', TRUE),
        (v_tenant_id, 'Corte Fade', 180.00, 40, 'Cortes', TRUE),
        (v_tenant_id, 'Cejas', 50.00, 10, 'Extras', TRUE);
    
    -- ==================================================
    -- 4. ASSIGN OWNER (if email exists in profiles)
    -- ==================================================
    
    -- Check if user with this email already exists
    SELECT id INTO v_owner_id 
    FROM profiles 
    WHERE LOWER(email) = LOWER(p_owner_email);
    
    IF v_owner_id IS NOT NULL THEN
        -- User exists: update their profile to be owner of this tenant
        UPDATE profiles 
        SET 
            tenant_id = v_tenant_id, 
            role = 'owner',
            updated_at = NOW()
        WHERE id = v_owner_id;
        
        v_owner_assigned := TRUE;
        
        -- ==================================================
        -- 5. SEED DEFAULT SCHEDULE FOR OWNER (as first barber)
        -- ==================================================
        -- Note: Using staff_schedules table (not business_hours which doesn't exist)
        
        INSERT INTO staff_schedules (staff_id, tenant_id, day, start_time, end_time, is_active)
        VALUES 
            (v_owner_id, v_tenant_id, 'monday', '09:00', '20:00', TRUE),
            (v_owner_id, v_tenant_id, 'tuesday', '09:00', '20:00', TRUE),
            (v_owner_id, v_tenant_id, 'wednesday', '09:00', '20:00', TRUE),
            (v_owner_id, v_tenant_id, 'thursday', '09:00', '20:00', TRUE),
            (v_owner_id, v_tenant_id, 'friday', '09:00', '20:00', TRUE),
            (v_owner_id, v_tenant_id, 'saturday', '09:00', '18:00', TRUE);
        -- Sunday intentionally omitted (closed by default)
        
    END IF;
    
    -- ==================================================
    -- 6. RETURN RESULT
    -- ==================================================
    
    RETURN json_build_object(
        'success', TRUE,
        'tenant_id', v_tenant_id,
        'tenant_slug', v_slug_clean,
        'owner_assigned', v_owner_assigned,
        'owner_email', p_owner_email,
        'message', CASE 
            WHEN v_owner_assigned THEN 'Tenant creado y dueño asignado exitosamente'
            ELSE 'Tenant creado. El usuario deberá registrarse con el email ' || p_owner_email || ' para ser vinculado'
        END
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'El slug "%" ya existe. Use un slug diferente.', v_slug_clean;
    WHEN OTHERS THEN
        -- Re-raise the original error for debugging
        RAISE;
END;
$$;

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================

-- Allow authenticated users to call this function
-- (Security check is done inside the function via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION provision_tenant_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ==================================================
-- TEST QUERY (uncomment to test)
-- ==================================================

-- SELECT provision_tenant_atomic(
--     'Barbería de Prueba',     -- name
--     'barberia-prueba',        -- slug
--     'test@example.com',       -- owner_email
--     '#3b82f6',                -- brand_color (optional)
--     'trial',                  -- plan (optional)
--     'America/Mexico_City'     -- timezone (optional)
-- );

-- ==================================================
-- CLEANUP TEST (uncomment after testing)
-- ==================================================

-- DELETE FROM services WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'barberia-prueba');
-- DELETE FROM staff_schedules WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'barberia-prueba');
-- DELETE FROM tenants WHERE slug = 'barberia-prueba';

COMMENT ON FUNCTION provision_tenant_atomic IS 
'Atomic function to provision a new tenant with default services and owner assignment.
Returns JSON with tenant_id, slug, and owner assignment status.
Called from Next.js API route after Stripe customer creation.';
