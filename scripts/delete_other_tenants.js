const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        envVars[key] = val;
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const KEEP_SLUG = 'fulanos';

async function run() {
    const { data: tenants, error: fetchError } = await supabase
        .from('tenants')
        .select('id, slug, name');
    
    if (fetchError) {
        console.error("Error fetching tenants:", fetchError);
        process.exit(1);
    }
    
    console.log(`Found ${tenants.length} tenants in total.`);
    
    const toDelete = tenants.filter(t => t.slug !== KEEP_SLUG);
    console.log(`Will delete ${toDelete.length} tenants. Keeping only: "${KEEP_SLUG}"`);
    
    for (const tenant of toDelete) {
        console.log(`Deleting tenant "${tenant.name}" (${tenant.slug}, ID: ${tenant.id})...`);
        try {
            // Delete audit logs referencing this tenant
            await supabase.from('audit_logs').delete().eq('tenant_id', tenant.id);
            // Delete app logs
            await supabase.from('app_logs').delete().eq('tenant_id', tenant.id);
            // Delete expenses
            await supabase.from('expenses').delete().eq('tenant_id', tenant.id);
            // Delete bookings
            await supabase.from('bookings').delete().eq('tenant_id', tenant.id);
            // Delete transactions
            await supabase.from('transactions').delete().eq('tenant_id', tenant.id);
            // Delete feedback
            await supabase.from('feedback').delete().eq('tenant_id', tenant.id);
            // Delete service categories
            await supabase.from('service_categories').delete().eq('tenant_id', tenant.id);
            // Delete services
            await supabase.from('services').delete().eq('tenant_id', tenant.id);
            // Delete staff schedules
            await supabase.from('staff_schedules').delete().eq('tenant_id', tenant.id);
            // Delete time blocks
            await supabase.from('time_blocks').delete().eq('tenant_id', tenant.id);
            // Delete staff skills
            await supabase.from('staff_skills').delete().eq('tenant_id', tenant.id);
            // Delete staff services linkage
            // Since staff_services doesn't have tenant_id directly, we need to delete links for staff belonging to this tenant
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', tenant.id);
            
            if (profiles && profiles.length > 0) {
                const staffIds = profiles.map(p => p.id);
                await supabase.from('staff_services').delete().in('staff_id', staffIds);
            }
            
            // Delete tenant members
            await supabase.from('tenant_members').delete().eq('tenant_id', tenant.id);
            // Update profiles referencing this tenant
            await supabase.from('profiles').update({ tenant_id: null, role: 'customer' }).eq('tenant_id', tenant.id);
            // Finally delete the tenant record
            const { error: deleteError } = await supabase.from('tenants').delete().eq('id', tenant.id);
            
            if (deleteError) {
                console.error(`Error deleting tenant record for ${tenant.slug}:`, deleteError.message);
            } else {
                console.log(`Successfully deleted "${tenant.name}".`);
            }
        } catch (err) {
            console.error(`Unexpected error deleting ${tenant.slug}:`, err);
        }
    }
    
    console.log("Cleanup completed!");
}

run();
