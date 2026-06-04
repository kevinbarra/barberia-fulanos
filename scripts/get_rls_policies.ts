import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('--- Consultando Políticas RLS de la tabla services ---');
    
    // We can query pg_policies using an RPC or check if we can query pg_catalog.pg_policies directly via Supabase RPC.
    // If there is no custom query RPC, we can write a simple function using Supabase RPC to check policies, or execute a query.
    // Let's check if the project has a custom SQL executor RPC. Sometimes developers define a run_sql or execute_sql RPC in development.
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'services';"
    });

    if (error) {
        console.log('El RPC execute_sql no existe (lo cual es normal en producción por seguridad).');
        console.log('Intentemos verificar las RLS policies revisando los archivos SQL en el repositorio.');
    } else {
        console.log('Políticas de la tabla services:');
        console.log(data);
    }
}

checkPolicies();
