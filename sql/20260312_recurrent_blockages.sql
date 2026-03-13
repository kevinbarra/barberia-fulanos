-- Migration: Add recurrence support to time_blocks
-- Description: Adds is_recurrent flag and recurrence_rule JSONB to handle repeating blockages (e.g., Lunch break every day)

-- 1. Add columns
ALTER TABLE time_blocks 
ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB DEFAULT NULL;

-- 2. Add comment for documentation
COMMENT ON COLUMN time_blocks.recurrence_rule IS 'JSON object defining the pattern: { type: "weekly" | "daily", days?: string[], frequency?: number, until?: iso_date }';

-- 3. (Optional) index for querying recurrent blocks faster
CREATE INDEX IF NOT EXISTS idx_time_blocks_recurrent ON time_blocks (is_recurrent) WHERE is_recurrent = TRUE;
