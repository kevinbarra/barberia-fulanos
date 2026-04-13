-- MIGRATION: 20260413_add_order_to_services
-- Description: Adds an order column to services for manual sorting

BEGIN;

ALTER TABLE services ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS "description" TEXT; -- Por si acaso no existiera

-- Notificar recarga de caché
NOTIFY pgrst, 'reload schema';

COMMIT;
