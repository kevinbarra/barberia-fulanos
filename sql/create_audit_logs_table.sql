-- Migration: Create Audit Logs table and RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL, -- e.g. 'CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'RESTORE'
    entity TEXT NOT NULL, -- e.g. 'bookings', 'profiles', 'services'
    entity_id TEXT,       -- ID of the affected record (TEXT to support legacy or different types)
    metadata JSONB DEFAULT '{}'::jsonb, -- Stores key details (e.g. { old_price: 100, new_price: 150 })
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Index for performance (Filtering by tenant and date is most common)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date 
ON audit_logs(tenant_id, created_at DESC);

-- Index for entity lookups (e.g. "Show me history of this booking")
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs(entity, entity_id);

-- STEP 3: Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- STEP 4: RLS Policies

-- Policy 1: INSERT - Authenticated users can create logs for their tenant
CREATE POLICY "Tenant members can insert logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

-- Policy 2: SELECT - Only Owners and Super Admins can view logs
CREATE POLICY "Owners and Admins can view logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'super_admin', 'admin') -- 'admin' included if that role exists, otherwise just owner/super_admin
    )
);

-- Policy 3: DELETE/UPDATE - NO ONE can modify or delete logs (Immutable)
-- We explicitly do NOT create policies for UPDATE or DELETE. 
-- By default in Supabase RLS, if no policy exists, the action is denied.

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TABLE IF EXISTS audit_logs;
