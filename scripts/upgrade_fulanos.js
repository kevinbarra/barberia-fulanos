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

async function run() {
    console.log("Upgrading 'fulanos' tenant to Plan Pro...");
    
    const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('id, name, slug, plan')
        .eq('slug', 'fulanos')
        .single();
    
    if (fetchError || !tenant) {
        console.error("Error fetching 'fulanos' tenant:", fetchError?.message || "Not found");
        process.exit(1);
    }
    
    console.log(`Current status: Name: "${tenant.name}", Plan: "${tenant.plan}"`);
    
    const { error: updateError } = await supabase
        .from('tenants')
        .update({
            plan: 'pro',
            subscription_status: 'active'
        })
        .eq('slug', 'fulanos');
    
    if (updateError) {
        console.error("Error upgrading tenant:", updateError.message);
        process.exit(1);
    }
    
    console.log("Successfully upgraded 'Fulanos Barber' to Plan Pro!");
}

run();
