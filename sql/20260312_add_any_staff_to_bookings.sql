-- Agregamos la columna 'is_any_staff' a la tabla bookings para el Load Balancer
-- Esto permite identificar si una cita fue hecha especificando un barbero o si fue "Cualquiera"

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_any_staff BOOLEAN DEFAULT false;

-- Opcional: Si necesitas buscar rápido por este campo
CREATE INDEX IF NOT EXISTS idx_bookings_is_any_staff ON bookings(is_any_staff);
