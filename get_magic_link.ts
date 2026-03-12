import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [key, ...rest] = line.split('=');
    if (key && rest) process.env[key.trim()] = rest.join('=').trim();
  }
});

const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getLink() {
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'kevinbarra2001@gmail.com',
  });
  if (error) console.error(error);
  else console.log("MAGIC_LINK=", data.properties?.action_link);
}

getLink();
