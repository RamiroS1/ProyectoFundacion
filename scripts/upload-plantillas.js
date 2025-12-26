// ============================================================================
// SCRIPT: Subir Plantillas a Supabase Storage
// Sube archivos Excel/Word a Supabase Storage y actualiza la base de datos
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CARGAR VARIABLES DE ENTORNO
// ============================================================================

// Intentar cargar .env.local primero, luego .env
const envLocalPath = join(__dirname, '..', '.env.local');
const envPath = join(__dirname, '..', '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Intentar cargar desde el directorio actual
  dotenv.config();
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Necesitas configurar:');
  console.error('   - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('   Puedes obtener la SERVICE_ROLE_KEY en:');
  console.error('   Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Crear cliente con service role key (permite operaciones admin)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'plantillas';
const PLANTILLAS_DIR = join(__dirname, '..', 'plantillas');

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Crea el bucket de Storage si no existe
 */
async function ensureBucket() {
  console.log(`📦 Verificando bucket "${BUCKET_NAME}"...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    throw new Error(`Error listando buckets: ${listError.message}`);
  }
  
  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`   Creando bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false, // Privado por defecto (solo usuarios autenticados)
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
      ]
    });
    
    if (createError) {
      throw new Error(`Error creando bucket: ${createError.message}`);
    }
    console.log(`   ✅ Bucket creado`);
  } else {
    console.log(`   ✅ Bucket ya existe`);
  }
}

/**
 * Obtiene el tipo de archivo basado en la extensión
 */
function getFileType(filename) {
  const ext = extname(filename).toLowerCase();
  if (['.xlsx', '.xls'].includes(ext)) return 'excel';
  if (['.docx', '.doc'].includes(ext)) return 'word';
  return 'excel'; // Por defecto
}

/**
 * Genera un código único para la plantilla basado en el nombre del archivo
 */
function generateCodigo(filename) {
  // Remover extensión
  const nameWithoutExt = basename(filename, extname(filename));
  // Limpiar y normalizar
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase()
    .substring(0, 50);
}

/**
 * Sanitiza el nombre de archivo para Storage (sin espacios ni caracteres especiales)
 */
function sanitizeFilename(filename) {
  // Mantener la extensión
  const ext = extname(filename);
  const nameWithoutExt = basename(filename, ext);
  
  // Reemplazar espacios y caracteres especiales
  const sanitized = nameWithoutExt
    .normalize('NFD') // Normalizar caracteres Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales con _
    .replace(/_+/g, '_') // Reemplazar múltiples _ con uno solo
    .replace(/^_+|_+$/g, ''); // Remover _ al inicio y final
  
  return `${sanitized}${ext}`;
}

/**
 * Sube un archivo a Supabase Storage
 */
async function uploadFile(filePath, filename) {
  console.log(`\n📤 Subiendo: ${filename}...`);
  
  const fileContent = readFileSync(filePath);
  const fileType = getFileType(filename);
  const sanitizedFilename = sanitizeFilename(filename);
  const storagePath = sanitizedFilename; // Sin prefijo "plantillas/" porque ya está en el bucket
  
  // Subir archivo
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileContent, {
      contentType: fileType === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true // Sobrescribir si existe
    });
  
  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`);
  }
  
  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  const publicUrl = urlData.publicUrl;
  console.log(`   ✅ Subido: ${publicUrl}`);
  
  return {
    storagePath,
    publicUrl,
    fileType,
    filename: sanitizedFilename,
    originalFilename: filename
  };
}

/**
 * Extrae campos de un archivo Excel y los guarda en la BD
 */
async function extraerYGuardarCampos(filePath, plantillaId) {
  try {
    console.log(`   🔍 Extrayendo campos del archivo Excel...`);
    
    const workbook = XLSX.readFile(filePath);
    const campos = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const camposHoja = extraerCamposDeHoja(sheet, sheetName, plantillaId);
      campos.push(...camposHoja);
    }
    
    if (campos.length > 0) {
      await crearCamposEnBD(campos);
    } else {
      console.log(`   ⚠️  No se pudieron extraer campos`);
    }
  } catch (error) {
    console.error(`   ⚠️  Error extrayendo campos: ${error.message}`);
    // No fallar el proceso completo si la extracción falla
  }
}

/**
 * Extrae campos de una hoja Excel (simplificado)
 */
function extraerCamposDeHoja(sheet, sheetName, plantillaId) {
  const campos = [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Saltar hojas muy grandes (probablemente listas)
  if (data.length > 500 || (data.length > 0 && data[0].length > 30)) {
    return campos;
  }
  
  // Detectar área/sección
  let areaSeccion = sheetName;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const filaTexto = data[i].join(' ').toLowerCase();
    if (filaTexto.includes('caracterización') || filaTexto.includes('caracterizacion')) {
      areaSeccion = 'CARACTERIZACIÓN';
    } else if (filaTexto.includes('distribución') || filaTexto.includes('distribucion')) {
      areaSeccion = 'DISTRIBUCIÓN DE ÁREAS';
    } else if (filaTexto.includes('datos generales')) {
      areaSeccion = 'DATOS GENERALES';
    }
  }
  
  // Extraer campos de encabezados
  if (data.length > 0 && data[0].length <= 20) {
    const encabezados = data[0];
    encabezados.forEach((encabezado, colIndex) => {
      if (!encabezado || String(encabezado).trim() === '') return;
      
      const nombreCampo = String(encabezado).trim();
      if (nombreCampo.length > 100) return;
      if (nombreCampo.match(/^[A-Z_]+$/)) return;
      if (nombreCampo.match(/^\d+$/)) return;
      
      const codigo = `CAMPO-${sheetName.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '')}-${colIndex + 1}`;
      
      campos.push({
        plantilla_id: plantillaId,
        codigo: codigo.replace(/[^A-Z0-9-]/g, '-'),
        pregunta: nombreCampo,
        descripcion: `Campo de la hoja "${sheetName}"`,
        hoja_excel: sheetName,
        celda_excel: `${String.fromCharCode(65 + colIndex)}1`,
        area_seccion: areaSeccion,
        tipo: 'texto', // Por defecto
        configuracion: { requerido: false },
        rol_asignado: 'ANALISTA',
        orden: colIndex + 1
      });
    });
  }
  
  // También buscar en formato pregunta-respuesta (columna A pregunta, B respuesta)
  for (let i = 0; i < Math.min(100, data.length); i++) {
    const fila = data[i];
    if (fila.length >= 2 && fila[0] && String(fila[0]).trim() && !String(fila[0]).match(/^[A-Z_]+$/)) {
      const pregunta = String(fila[0]).trim();
      if (pregunta.length > 5 && pregunta.length < 100) {
        const codigo = `CAMPO-${sheetName.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '')}-Q${i + 1}`;
        
        // Evitar duplicados
        if (!campos.some(c => c.pregunta === pregunta)) {
          campos.push({
            plantilla_id: plantillaId,
            codigo: codigo.replace(/[^A-Z0-9-]/g, '-'),
            pregunta: pregunta,
            descripcion: `Campo de la hoja "${sheetName}"`,
            hoja_excel: sheetName,
            celda_excel: `A${i + 1}`,
            area_seccion: areaSeccion,
            tipo: 'texto',
            configuracion: { requerido: false },
            rol_asignado: 'ANALISTA',
            orden: campos.length + 1
          });
        }
      }
    }
  }
  
  return campos;
}

/**
 * Crea campos en la base de datos
 */
async function crearCamposEnBD(campos) {
  if (campos.length === 0) return;
  
  // Insertar en lotes de 50
  const lotes = [];
  for (let i = 0; i < campos.length; i += 50) {
    lotes.push(campos.slice(i, i + 50));
  }
  
  let totalCreados = 0;
  
  for (const lote of lotes) {
    // Verificar cuáles ya existen
    const codigos = lote.map(c => c.codigo);
    const { data: existentes } = await supabase
      .from('campos_plantilla')
      .select('codigo')
      .in('codigo', codigos);
    
    const codigosExistentes = new Set((existentes || []).map(e => e.codigo));
    const nuevos = lote.filter(c => !codigosExistentes.has(c.codigo));
    
    // Insertar nuevos
    if (nuevos.length > 0) {
      const { error: insertError } = await supabase
        .from('campos_plantilla')
        .insert(nuevos);
      
      if (insertError) {
        console.error(`   ⚠️  Error insertando algunos campos: ${insertError.message}`);
      } else {
        totalCreados += nuevos.length;
      }
    }
  }
  
  if (totalCreados > 0) {
    console.log(`   ✅ ${totalCreados} campo(s) extraído(s) y guardado(s)`);
  }
}

/**
 * Crea o actualiza el registro en la base de datos
 * @param {Object} fileInfo - Información del archivo subido
 * @param {string} filePath - Ruta del archivo original en el sistema de archivos
 */
async function upsertPlantilla(fileInfo, filePath) {
  const codigo = generateCodigo(fileInfo.originalFilename);
  const nombre = basename(fileInfo.originalFilename, extname(fileInfo.originalFilename));
  
  // Intentar obtener el primer usuario admin como creador
  let { data: adminUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('rol_profesional', 'ADMIN')
    .limit(1)
    .single();
  
  // Si no hay admin, usar el primer usuario disponible en user_profiles
  if (!adminUser) {
    console.log('   ⚠️  No se encontró usuario ADMIN, buscando en user_profiles...');
    const { data: firstUser } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (!firstUser) {
      // Si no hay en user_profiles, buscar en auth.users directamente
      console.log('   ⚠️  No hay usuarios en user_profiles, buscando en auth.users...');
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      if (!authUsers || authUsers.users.length === 0) {
        throw new Error('No se encontró ningún usuario en el sistema. Registra un usuario primero.');
      }
      
      adminUser = { id: authUsers.users[0].id };
      console.log(`   ✅ Usando usuario de auth.users: ${adminUser.id}`);
    } else {
      adminUser = firstUser;
      console.log(`   ✅ Usando usuario: ${adminUser.id}`);
    }
  }
  
  // Verificar si ya existe una plantilla con este código
  const { data: existing } = await supabase
    .from('plantillas_documento')
    .select('id')
    .eq('codigo', codigo)
    .single();
  
  if (existing) {
    console.log(`   ⚠️  Plantilla con código "${codigo}" ya existe. Actualizando...`);
    const { error: updateError } = await supabase
      .from('plantillas_documento')
      .update({
        archivo_url: fileInfo.publicUrl,
        archivo_tipo: fileInfo.fileType,
        archivo_version: '1.0.0',
        activa: true
      })
      .eq('id', existing.id);
    
    if (updateError) {
      throw new Error(`Error actualizando plantilla: ${updateError.message}`);
    }
    console.log(`   ✅ Plantilla actualizada en BD`);
    
    // Extraer campos automáticamente si es Excel
    if (fileInfo.fileType === 'excel') {
      await extraerYGuardarCampos(filePath, existing.id);
    }
    
    return existing.id;
  } else {
    console.log(`   📝 Creando registro en BD...`);
    const { data: newPlantilla, error: insertError } = await supabase
      .from('plantillas_documento')
      .insert({
        codigo,
        nombre,
        descripcion: `Plantilla: ${nombre}`,
        archivo_url: fileInfo.publicUrl,
        archivo_tipo: fileInfo.fileType,
        archivo_version: '1.0.0',
        creado_por: adminUser.id,
        activa: true
      })
      .select()
      .single();
    
    if (insertError) {
      throw new Error(`Error creando plantilla: ${insertError.message}`);
    }
    console.log(`   ✅ Plantilla creada en BD (ID: ${newPlantilla.id})`);
    
    // Extraer campos automáticamente si es Excel
    if (fileInfo.fileType === 'excel') {
      await extraerYGuardarCampos(filePath, newPlantilla.id);
    }
    
    return newPlantilla.id;
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  try {
    console.log('🚀 Iniciando subida de plantillas...\n');
    
    // 1. Verificar/crear bucket
    await ensureBucket();
    
    // 2. Leer archivos de la carpeta plantillas
    console.log(`\n📁 Leyendo archivos de: ${PLANTILLAS_DIR}`);
    const files = readdirSync(PLANTILLAS_DIR)
      .filter(file => {
        const ext = extname(file).toLowerCase();
        return ['.xlsx', '.xls', '.docx', '.doc'].includes(ext);
      });
    
    if (files.length === 0) {
      console.log('   ⚠️  No se encontraron archivos Excel/Word en la carpeta plantillas');
      return;
    }
    
    console.log(`   ✅ Encontrados ${files.length} archivo(s)\n`);
    
    // 3. Subir cada archivo
    for (const filename of files) {
      const filePath = join(PLANTILLAS_DIR, filename);
      
      try {
        // Subir a Storage
        const fileInfo = await uploadFile(filePath, filename);
        
        // Crear/actualizar en BD y extraer campos automáticamente
        await upsertPlantilla(fileInfo, filePath);
        
      } catch (error) {
        console.error(`   ❌ Error procesando ${filename}:`, error.message);
        // Continuar con el siguiente archivo
      }
    }
    
    console.log('\n✅ Proceso completado!\n');
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main();

