// Script para asignar documentos a un usuario
// Uso: node scripts/asignar-documento.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function asignarDocumento(emailUsuario) {
  try {
    console.log(`\n🔍 Buscando usuario: ${emailUsuario}`);
    
    // 1. Buscar el usuario por email en user_profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', emailUsuario);
    
    if (profileError) {
      console.error('❌ Error buscando usuario:', profileError);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.error('❌ Usuario no encontrado:', emailUsuario);
      console.log('\n💡 El usuario necesita registrarse primero en la aplicación.');
      console.log('   Una vez registrado, su perfil se creará automáticamente.');
      console.log('\n📝 Alternativamente, ejecuta el script SQL en Supabase:');
      console.log('   Ver archivo: scripts/asignar-documento.sql');
      return;
    }
    
    const profile = profiles[0];
    
    console.log('✅ Usuario encontrado:');
    console.log('   - ID:', profile.id);
    console.log('   - Nombre:', profile.nombre_completo);
    console.log('   - Rol:', profile.rol_profesional);
    const userId = profile.id;

    // 2. Buscar o crear una plantilla
    console.log('\n🔍 Buscando plantillas disponibles...');
    const { data: plantillas, error: plantillasError } = await supabase
      .from('plantillas_documento')
      .select('*')
      .eq('activa', true)
      .limit(1);

    if (plantillasError) {
      console.error('❌ Error buscando plantillas:', plantillasError);
      return;
    }

    let plantillaId;
    if (plantillas && plantillas.length > 0) {
      console.log('✅ Plantilla encontrada:', plantillas[0].nombre);
      plantillaId = plantillas[0].id;
    } else {
      console.log('⚠️  No hay plantillas. Creando plantilla de ejemplo...');
      
      // Crear plantilla de ejemplo
      const { data: nuevaPlantilla, error: crearError } = await supabase
        .from('plantillas_documento')
        .insert({
          codigo: 'F15.GO6.PP',
          nombre: 'FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS',
          descripcion: 'Formato de caracterización para distribución de áreas',
          archivo_url: '',
          archivo_tipo: 'excel',
          archivo_version: '1.0.0',
          creado_por: userId,
          activa: true,
        })
        .select()
        .single();

      if (crearError) {
        console.error('❌ Error creando plantilla:', crearError);
        return;
      }

      console.log('✅ Plantilla creada:', nuevaPlantilla.nombre);
      plantillaId = nuevaPlantilla.id;
    }

    // 3. Crear documento instancia
    console.log('\n📄 Creando documento instancia...');
    const numeroDoc = `DOC-${Date.now()}`;
    const { data: documento, error: docError } = await supabase
      .from('documentos_instancia')
      .insert({
        plantilla_id: plantillaId,
        numero_documento: numeroDoc,
        titulo: 'Formato de Caracterización - Instancia 1',
        estado: 'BORRADOR',
        creado_por: userId,
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Error creando documento:', docError);
      return;
    }

    console.log('✅ Documento creado:', documento.numero_documento);
    console.log('✅ Documento ID:', documento.id);

    // 4. Verificar si hay campos en la plantilla
    console.log('\n🔍 Verificando campos de la plantilla...');
    const { data: campos, error: camposError } = await supabase
      .from('campos_plantilla')
      .select('*')
      .eq('plantilla_id', plantillaId);

    if (camposError) {
      console.error('❌ Error buscando campos:', camposError);
    } else if (campos && campos.length > 0) {
      console.log(`✅ Encontrados ${campos.length} campos en la plantilla`);
    } else {
      console.log('⚠️  No hay campos en la plantilla. El usuario verá el documento pero sin campos para editar.');
    }

    console.log('\n✅ ¡Documento asignado exitosamente!');
    console.log(`\n📋 Resumen:`);
    console.log(`   - Usuario: ${emailUsuario}`);
    console.log(`   - Documento: ${documento.numero_documento}`);
    console.log(`   - Plantilla: ${plantillas && plantillas.length > 0 ? plantillas[0].nombre : 'Nueva'}`);
    console.log(`   - Estado: ${documento.estado}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
const email = process.argv[2] || 'ramiroavila999@gmail.com';
asignarDocumento(email);

