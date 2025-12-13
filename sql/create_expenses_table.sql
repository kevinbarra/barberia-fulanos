-- Migration: Create expenses table for cash drawer tracking
-- Run this in the Supabase SQL Editor

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_created 
ON expenses(tenant_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Tenant members can insert expenses
CREATE POLICY "Tenant members can insert expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

-- 5. Policy: Owner and super admin can view expenses
CREATE POLICY "Owners can view expenses"
ON expenses FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'super_admin', 'admin')
    )
);

-- 6. Policy: Owners can delete expenses
CREATE POLICY "Owners can delete expenses"
ON expenses FOR DELETE
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'super_admin')
    )
);

-- Done! 
-- Staff can create expenses but cannot view/delete them.
-- Owners can view all expenses and delete if needed.
