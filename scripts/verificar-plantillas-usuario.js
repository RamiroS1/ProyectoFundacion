// ============================================================================
// SCRIPT: Verificar Plantillas y Campos para Usuario
// Verifica qué plantillas puede ver un usuario y si tienen campos asignados
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
const envLocalPath = join(__dirname, '..', '.env.local');
const envPath = join(__dirname, '..', '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    const emailUsuario = 'ramiroavila999@gmail.com';
    
    console.log(`🔍 Verificando plantillas para: ${emailUsuario}\n`);
    
    // 1. Obtener usuario
    const { data: usuarios, error: userError } = await supabase.auth.admin.listUsers();
    const usuario = usuarios?.users.find(u => u.email === emailUsuario);
    
    if (!usuario) {
      console.error(`❌ Usuario ${emailUsuario} no encontrado`);
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${usuario.id}\n`);
    
    // 2. Obtener perfil del usuario
    const { data: perfil } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', usuario.id)
      .single();
    
    if (!perfil) {
      console.error(`❌ Perfil no encontrado para ${emailUsuario}`);
      return;
    }
    
    console.log(`📋 Rol del usuario: ${perfil.rol_profesional}\n`);
    
    // 3. Obtener todas las plantillas activas
    const { data: todasPlantillas } = await supabase
      .from('plantillas_documento')
      .select('id, codigo, nombre, activa')
      .eq('activa', true);
    
    console.log(`📄 Total plantillas activas: ${todasPlantillas?.length || 0}\n`);
    
    // 4. Para cada plantilla, verificar si tiene campos asignados al rol del usuario
    for (const plantilla of todasPlantillas || []) {
      const { data: campos } = await supabase
        .from('campos_plantilla')
        .select('id, codigo, pregunta, rol_asignado')
        .eq('plantilla_id', plantilla.id)
        .eq('rol_asignado', perfil.rol_profesional);
      
      const tieneCampos = (campos?.length || 0) > 0;
      
      console.log(`${tieneCampos ? '✅' : '❌'} ${plantilla.nombre}`);
      console.log(`   Código: ${plantilla.codigo}`);
      console.log(`   Campos asignados a ${perfil.rol_profesional}: ${campos?.length || 0}`);
      
      if (!tieneCampos) {
        console.log(`   ⚠️  Esta plantilla NO tiene campos asignados a ${perfil.rol_profesional}`);
        console.log(`   💡 Necesitas asignar campos a este rol para que el usuario pueda verla\n`);
      } else {
        console.log(`   ✅ El usuario puede ver y editar esta plantilla\n`);
      }
    }
    
    // 5. Verificar documentos del usuario
    const { data: documentos } = await supabase
      .from('documentos_instancia')
      .select('id, plantilla_id, numero_documento, titulo, estado, creado_por')
      .eq('creado_por', usuario.id);
    
    console.log(`\n📚 Documentos creados por ${emailUsuario}: ${documentos?.length || 0}`);
    
    if (documentos && documentos.length > 0) {
      // Agrupar por plantilla para detectar duplicados
      const porPlantilla = new Map();
      documentos.forEach(doc => {
        const key = doc.plantilla_id;
        if (!porPlantilla.has(key)) {
          porPlantilla.set(key, []);
        }
        porPlantilla.get(key).push(doc);
      });
      
      console.log(`\n📊 Documentos por plantilla:`);
      for (const [plantillaId, docs] of porPlantilla.entries()) {
        const { data: plantilla } = await supabase
          .from('plantillas_documento')
          .select('nombre')
          .eq('id', plantillaId)
          .single();
        
        console.log(`   ${plantilla?.nombre || plantillaId}: ${docs.length} documento(s)`);
        if (docs.length > 1) {
          console.log(`   ⚠️  Hay ${docs.length} documentos para esta plantilla (posibles duplicados)`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

