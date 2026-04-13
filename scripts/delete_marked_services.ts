import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_IDS = [
    'bef3fa7b-618a-4d9b-9556-56b780752ff4', // Arreglo de Barba (Delineado)
    '89cb067d-ff93-4859-99d6-344b9db85f0a', // Barba Premium (Toalla/Mascarilla/Masaje)
    'f7084656-ba5e-4cd8-9b7c-e8d8d16b8f93', // Cejas Spa (Exfoliación/Mascarilla/Masaje)
    '142c3966-2a9b-47ce-be8d-98cfb778726b', // Corte Clásico Premium (Masaje/Mascarilla/Bebida)
    '543a0ca8-0d80-43a3-969b-53e8a86b619e'  // PAQUETE COMPLETO (Corte + Barba + Spa Completo)
];

async function deleteMarkedServices() {
    console.log('--- Iniciando Limpieza de Servicios Seleccionados ---');

    for (const id of TARGET_IDS) {
        // 1. Intentar borrar
        const { error: deleteError } = await supabase.from('services').delete().eq('id', id);

        if (deleteError) {
            console.log(`⚠️ No se pudo eliminar el servicio [${id}] (probablemente por citas agendadas).`);
            console.log(`🔄 Marcando como inactivo...`);
            
            // 2. Si falla el borrado, marcar como inactivo
            const { error: updateError } = await supabase.from('services').update({ is_active: false }).eq('id', id);
            
            if (updateError) {
                console.error(`❌ Error al desactivar [${id}]:`, updateError.message);
            } else {
                console.log(`✅ Servicio [${id}] desactivado correctamente.`);
            }
        } else {
            console.log(`✅ Servicio [${id}] eliminado físicamente.`);
        }
    }

    console.log('--- Limpieza completada ---');
}

deleteMarkedServices();
