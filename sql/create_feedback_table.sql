-- Migration: Create Feedback Table for Private Negative Reviews
-- Execute in Supabase SQL Editor

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    guest_name TEXT,
    guest_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate ratings per booking
CREATE UNIQUE INDEX IF NOT EXISTS feedback_booking_unique ON feedback(booking_id) WHERE booking_id IS NOT NULL;

-- Add rated_at column to bookings to track if a booking has been rated
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- RLS: Enable
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Owners/Staff can read feedback for their tenant
CREATE POLICY "Owners can read tenant feedback"
    ON feedback FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff', 'super_admin')
        )
    );

-- Policy: Anyone can insert feedback (public rating page)
CREATE POLICY "Anyone can submit feedback"
    ON feedback FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS feedback_tenant_created ON feedback(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_rating ON feedback(tenant_id, rating);

COMMENT ON TABLE feedback IS 'Private feedback from 1-3 star ratings (negative reviews captured internally)';
