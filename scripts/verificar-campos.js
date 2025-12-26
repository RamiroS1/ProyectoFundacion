// ============================================================================
// SCRIPT: Verificar Campos Extraídos
// Verifica que los campos se hayan creado correctamente en la BD
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
    console.log('🔍 Verificando campos extraídos...\n');
    
    // 1. Obtener todas las plantillas
    const { data: plantillas, error: plantillasError } = await supabase
      .from('plantillas_documento')
      .select('id, codigo, nombre, activa')
      .eq('activa', true)
      .order('nombre');
    
    if (plantillasError) {
      throw new Error(`Error obteniendo plantillas: ${plantillasError.message}`);
    }
    
    console.log(`📋 Plantillas encontradas: ${plantillas.length}\n`);
    
    // 2. Para cada plantilla, contar campos
    for (const plantilla of plantillas) {
      const { data: campos, error: camposError } = await supabase
        .from('campos_plantilla')
        .select('id, codigo, pregunta, tipo, area_seccion, rol_asignado, hoja_excel')
        .eq('plantilla_id', plantilla.id)
        .order('orden');
      
      if (camposError) {
        console.error(`   ❌ Error obteniendo campos: ${camposError.message}`);
        continue;
      }
      
      const totalCampos = campos?.length || 0;
      const camposPorTipo = {};
      const camposPorArea = {};
      const camposPorRol = {};
      const hojas = new Set();
      
      campos?.forEach(campo => {
        // Contar por tipo
        camposPorTipo[campo.tipo] = (camposPorTipo[campo.tipo] || 0) + 1;
        
        // Contar por área
        const area = campo.area_seccion || 'Sin área';
        camposPorArea[area] = (camposPorArea[area] || 0) + 1;
        
        // Contar por rol
        camposPorRol[campo.rol_asignado] = (camposPorRol[campo.rol_asignado] || 0) + 1;
        
        // Agregar hoja
        if (campo.hoja_excel) {
          hojas.add(campo.hoja_excel);
        }
      });
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 ${plantilla.nombre}`);
      console.log(`   Código: ${plantilla.codigo}`);
      console.log(`   ID: ${plantilla.id}`);
      console.log(`   Total campos: ${totalCampos}`);
      
      if (totalCampos > 0) {
        console.log(`\n   📊 Por tipo:`);
        Object.entries(camposPorTipo).forEach(([tipo, count]) => {
          console.log(`      - ${tipo}: ${count}`);
        });
        
        console.log(`\n   📁 Por área/sección:`);
        Object.entries(camposPorArea).slice(0, 10).forEach(([area, count]) => {
          console.log(`      - ${area}: ${count}`);
        });
        if (Object.keys(camposPorArea).length > 10) {
          console.log(`      ... y ${Object.keys(camposPorArea).length - 10} más`);
        }
        
        console.log(`\n   👥 Por rol:`);
        Object.entries(camposPorRol).forEach(([rol, count]) => {
          console.log(`      - ${rol}: ${count}`);
        });
        
        console.log(`\n   📑 Hojas Excel: ${hojas.size}`);
        Array.from(hojas).slice(0, 5).forEach(hoja => {
          console.log(`      - ${hoja}`);
        });
        if (hojas.size > 5) {
          console.log(`      ... y ${hojas.size - 5} más`);
        }
        
        // Mostrar primeros 5 campos como ejemplo
        console.log(`\n   🔍 Primeros 5 campos:`);
        campos.slice(0, 5).forEach((campo, idx) => {
          console.log(`      ${idx + 1}. [${campo.tipo}] ${campo.pregunta} (${campo.area_seccion || 'Sin área'})`);
        });
      } else {
        console.log(`   ⚠️  No hay campos asociados a esta plantilla`);
      }
    }
    
    // 3. Resumen general
    const { data: todosCampos } = await supabase
      .from('campos_plantilla')
      .select('plantilla_id');
    
    const totalGeneral = todosCampos?.length || 0;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN GENERAL`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Total plantillas activas: ${plantillas.length}`);
    console.log(`   Total campos en BD: ${totalGeneral}`);
    console.log(`   Promedio campos por plantilla: ${plantillas.length > 0 ? Math.round(totalGeneral / plantillas.length) : 0}`);
    console.log(`\n✅ Verificación completada!\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

