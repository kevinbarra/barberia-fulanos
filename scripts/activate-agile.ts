import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nhsptvtaskmwhhapxsng.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc3B0dnRhc2ttd2hoYXB4c25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MDQwMywiZXhwIjoyMDc5ODU2NDAzfQ.x8tgVJmWZvMk6Uh_g5UCnxeoV-NYZVCFeyeVHRoDz-E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function activateAgile() {
    const { data: tenant, error: fetchErr } = await supabase
        .from('tenants')
        .select('id, settings')
        .eq('slug', 'fulanos')
        .single();

    if (fetchErr || !tenant) {
        console.error('Error fetching tenant:', fetchErr);
        return;
    }

    const newSettings = { ...(tenant.settings || {}), workflow_mode: 'auto' };

    const { error: updateErr } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('id', tenant.id);

    if (updateErr) {
        console.error('Error updating tenant:', updateErr);
    } else {
        console.log('✅ Agile Mode activated for Fulanos!');
    }
}
activateAgile();
