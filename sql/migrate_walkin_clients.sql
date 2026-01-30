-- ============================================================
-- MIGRACIÓN: Walk-in Clientes → Perfiles Recuperables
-- ============================================================
-- 
-- Este script toma los clientes "Walk-in" que fueron ingresados 
-- sin cuenta (solo con nombre en notas) y les crea un perfil 
-- consultable, vinculando sus citas históricas.
--
-- CONVENCIÓN DE DATOS MIGRADOS:
-- - Nombre: Agrega " *" al final (ej: "Don Tino *")
-- - Teléfono: Usa "*NombreSinEspacios" (ej: "*DonTino")
--   Esto evita conflictos con teléfonos reales.
--
-- EJECUTAR EN: Supabase SQL Editor
-- TENANT: fulanos (cambiar slug si es necesario)
-- ============================================================

DO $$
DECLARE
    r RECORD;
    clean_name TEXT;
    clean_phone TEXT;
    new_profile_id UUID;
    tenant_uuid UUID;
    migrated_count INT := 0;
BEGIN
    -- 1. Obtener el ID del Tenant (Fulanos)
    SELECT id INTO tenant_uuid FROM tenants WHERE slug = 'fulanos';
    
    IF tenant_uuid IS NULL THEN
        RAISE EXCEPTION 'Tenant "fulanos" no encontrado';
    END IF;
    
    RAISE NOTICE '🔍 Iniciando migración para tenant: %', tenant_uuid;

    -- 2. Recorrer las notas antiguas con Walk-in
    FOR r IN 
        SELECT DISTINCT notes 
        FROM bookings 
        WHERE tenant_id = tenant_uuid 
        AND customer_id IS NULL 
        AND notes LIKE 'Walk-in:%' 
        -- Filtros de seguridad para no migrar basura
        AND notes NOT ILIKE '%Walk-in: Walk-in%' 
        AND notes NOT ILIKE '%Cliente: Cliente%' 
        AND notes NOT ILIKE '%Auto-cerrado%'
        AND notes NOT ILIKE '%Señor celular%'
    LOOP
        -- 3. Limpiar el nombre (Quitar "Walk-in: ")
        clean_name := TRIM(SUBSTRING(r.notes FROM 10)); 
        
        -- SI el nombre quedó vacío o muy corto, saltarlo
        IF LENGTH(clean_name) < 2 THEN 
            RAISE NOTICE '⏭️ Saltando nota vacía/corta: "%"', r.notes;
            CONTINUE;
        END IF;

        -- 4. Generar el "Teléfono Único" con Asterisk
        -- Esto crea un identificador único que no colisiona con teléfonos reales
        clean_phone := '*' || REPLACE(clean_name, ' ', '');

        -- 5. Verificar si ya existe (para no duplicar)
        SELECT id INTO new_profile_id FROM profiles 
        WHERE phone = clean_phone AND tenant_id = tenant_uuid LIMIT 1;

        -- 6. Si no existe, CREARLO
        IF new_profile_id IS NULL THEN
            INSERT INTO profiles (id, full_name, phone, tenant_id, role)
            VALUES (
                gen_random_uuid(), 
                clean_name || ' *',  -- Marcador visual de migrado
                clean_phone, 
                tenant_uuid,
                'customer'
            )
            RETURNING id INTO new_profile_id;
            
            RAISE NOTICE '✅ Creado perfil: % * (tel: %)', clean_name, clean_phone;
            migrated_count := migrated_count + 1;
        ELSE
            RAISE NOTICE '♻️ Ya existe: % *', clean_name;
        END IF;

        -- 7. VINCULAR: Actualizar las citas viejas con este customer_id
        UPDATE bookings 
        SET customer_id = new_profile_id
        WHERE notes = r.notes 
        AND tenant_id = tenant_uuid 
        AND customer_id IS NULL;
        
    END LOOP;
    
    RAISE NOTICE '🎉 Migración completada. Perfiles creados: %', migrated_count;
END $$;

-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================
-- Ejecutar después para confirmar resultados:

-- Ver clientes migrados (con asterisco)
-- SELECT full_name, phone, created_at 
-- FROM profiles 
-- WHERE phone LIKE '*%' 
-- ORDER BY created_at DESC;

-- Ver cuántas citas quedaron huérfanas
-- SELECT COUNT(*) as orphan_bookings
-- FROM bookings 
-- WHERE customer_id IS NULL 
-- AND notes LIKE 'Walk-in:%';
