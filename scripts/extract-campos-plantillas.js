// ============================================================================
// SCRIPT: Extraer Campos de Plantillas Excel
// Lee las plantillas Excel y extrae los campos reales para crear registros
// en campos_plantilla
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CARGAR VARIABLES DE ENTORNO
// ============================================================================

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

const PLANTILLAS_DIR = join(__dirname, '..', 'plantillas');

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Detecta el tipo de campo basado en el contenido de la celda
 */
function detectarTipoCampo(valor, nombreCampo = '') {
  const nombreLower = nombreCampo.toLowerCase();
  
  // Detectar por nombre
  if (nombreLower.includes('fecha') || nombreLower.includes('date')) {
    return 'fecha';
  }
  if (nombreLower.includes('cantidad') || nombreLower.includes('numero') || nombreLower.includes('número')) {
    return 'numero';
  }
  if (nombreLower.includes('observacion') || nombreLower.includes('observación') || nombreLower.includes('comentario')) {
    return 'textarea';
  }
  
  // Detectar por valor
  if (typeof valor === 'number') {
    return 'numero';
  }
  
  if (typeof valor === 'string') {
    // Intentar detectar fecha
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor) || /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return 'fecha';
    }
    // Si es muy largo, probablemente es textarea
    if (valor.length > 100) {
      return 'textarea';
    }
  }
  
  return 'texto'; // Por defecto
}

/**
 * Verifica si una hoja es una lista de referencia (no un formulario)
 */
function esHojaDeLista(sheetName, data) {
  const nombreLower = sheetName.toLowerCase();
  
  // Nombres comunes de hojas de lista (más estricto)
  const nombresLista = [
    'lista', 'listas', 'listado', 'código', 'codigo', 'cod', 
    'referencia', 'datos', 'depto', 'mun', 'poblado', 'barrio',
    'comuna', 'resgu', 'pais', 'comunidad'
  ];
  
  // Excepciones: estas hojas pueden tener campos aunque tengan nombres similares
  const excepciones = ['formato', 'instructivo', 'instrucciones', 'orientaciones'];
  if (excepciones.some(e => nombreLower.includes(e))) {
    return false; // No filtrar estas hojas
  }
  
  // Si el nombre contiene palabras de lista Y tiene muchas filas/columnas
  if (nombresLista.some(n => nombreLower.includes(n))) {
    // Si tiene más de 200 filas, es una lista
    if (data.length > 200) {
      return true;
    }
    // Si tiene más de 30 columnas, es una lista
    if (data.length > 0 && data[0].length > 30) {
      return true;
    }
  }
  
  // Si tiene más de 500 filas, definitivamente es una lista
  if (data.length > 500) {
    return true;
  }
  
  return false;
}

/**
 * Extrae campos de una hoja Excel
 */
function extraerCamposDeHoja(sheet, sheetName, plantillaId) {
  const campos = [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Saltar hojas de lista/referencia
  if (esHojaDeLista(sheetName, data)) {
    return campos; // Retornar vacío
  }
  
  // Estrategia 1: Buscar encabezados en la primera fila
  if (data.length > 0) {
    const encabezados = data[0];
    let areaSeccion = sheetName; // Usar nombre de hoja como área por defecto
    
    // Buscar fila de sección (filas que contengan palabras clave)
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const fila = data[i];
      const filaTexto = fila.join(' ').toLowerCase();
      
      // Detectar secciones comunes
      if (filaTexto.includes('datos generales') || filaTexto.includes('información general')) {
        areaSeccion = 'DATOS GENERALES';
      } else if (filaTexto.includes('caracterización') || filaTexto.includes('caracterizacion')) {
        areaSeccion = 'CARACTERIZACIÓN';
      } else if (filaTexto.includes('distribución') || filaTexto.includes('distribucion')) {
        areaSeccion = 'DISTRIBUCIÓN DE ÁREAS';
      } else if (filaTexto.includes('participantes')) {
        areaSeccion = 'PARTICIPANTES';
      } else if (filaTexto.includes('actividades')) {
        areaSeccion = 'ACTIVIDADES';
      } else if (filaTexto.includes('seguimiento') || filaTexto.includes('monitoreo')) {
        areaSeccion = 'SEGUIMIENTO';
      }
    }
    
    // Procesar encabezados (solo si hay menos de 20 columnas - formularios típicos)
    if (encabezados.length <= 20) {
      encabezados.forEach((encabezado, colIndex) => {
        if (!encabezado || String(encabezado).trim() === '') return;
        
        const nombreCampo = String(encabezado).trim();
        
        // Filtrar campos que son claramente títulos o encabezados de lista
        if (nombreCampo.length > 100) return; // Muy largo, probablemente es un título
        if (nombreCampo.match(/^[A-Z_]+$/)) return; // Solo mayúsculas y guiones, probablemente código
        if (nombreCampo.match(/^\d+$/)) return; // Solo números
        
        // Obtener valor de ejemplo de la segunda fila (si existe)
        let valorEjemplo = '';
        if (data.length > 1 && data[1][colIndex] !== undefined) {
          valorEjemplo = String(data[1][colIndex]).trim();
        }
        
        // Si el valor de ejemplo es muy largo o parece un código, saltar
        if (valorEjemplo.length > 50) return;
        
        const tipo = detectarTipoCampo(valorEjemplo, nombreCampo);
        
        // Generar código único
        const codigo = `CAMPO-${sheetName.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '')}-${colIndex + 1}`;
        
        campos.push({
          plantilla_id: plantillaId,
          codigo: codigo.replace(/[^A-Z0-9-]/g, '-'),
          pregunta: nombreCampo,
          descripcion: `Campo extraído de la hoja "${sheetName}"`,
          hoja_excel: sheetName,
          celda_excel: `${String.fromCharCode(65 + colIndex)}1`, // A1, B1, etc.
          area_seccion: areaSeccion,
          tipo: tipo,
          configuracion: {
            requerido: false,
            placeholder: valorEjemplo || `Ingrese ${nombreCampo.toLowerCase()}`
          },
          rol_asignado: 'ANALISTA', // Por defecto, se puede ajustar después
          orden: colIndex + 1
        });
      });
    }
  }
  
  // Estrategia 2: Buscar patrones de pregunta-respuesta (si no hay encabezados claros o hay pocos)
  if (campos.length < 5 && data.length > 1) {
    let areaSeccion = sheetName;
    let orden = campos.length + 1;
    
    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      if (!fila || fila.length === 0) continue;
      
      // Buscar en todas las columnas posibles
      for (let col = 0; col < Math.min(fila.length, 10); col++) {
        const texto = String(fila[col] || '').trim();
        
        if (!texto || texto.length < 5) continue;
        
        // Detectar títulos de sección (filas completas con texto largo)
        if (texto.length > 50 && texto.length < 200 && 
            (texto.includes('FASE') || texto.includes('INFORMACIÓN') || 
             texto.includes('CARACTERIZACIÓN') || texto.includes('DISTRIBUCIÓN'))) {
          // Extraer nombre de sección
          const match = texto.match(/(FASE\s+[IVX]+\.?\s*[^-\n]+|INFORMACIÓN\s+[^-\n]+|CARACTERIZACIÓN[^-\n]+|DISTRIBUCIÓN[^-\n]+)/i);
          if (match) {
            areaSeccion = match[1].trim().substring(0, 50);
          }
          continue;
        }
        
        // Detectar campos reales (texto corto a medio, no títulos)
        if (texto.length >= 5 && texto.length < 80 && 
            !texto.match(/^[A-Z_\s]+$/) && // No solo mayúsculas y espacios
            !texto.match(/^PROCESO/i) && // No títulos de proceso
            !texto.match(/^\d+\.\s*$/) && // No solo números
            !texto.includes('\r\n') && // No texto multilínea en una celda
            !texto.match(/^FASE\s+[IVX]+/i) && // No títulos de fase
            !texto.match(/^INFORMACIÓN\s+(GENERAL|COMPLEMENTARIA)/i) && // No títulos largos
            col < 5) { // Solo primeras columnas (donde suelen estar los campos)
          
          // Verificar que no sea un título muy largo o en mayúsculas
          if (texto.length > 60 && texto === texto.toUpperCase()) continue;
          
          // Filtrar títulos de sección comunes
          const esTituloSeccion = /^(FASE|INFORMACIÓN|CARACTERIZACIÓN|DISTRIBUCIÓN|PROCESO)/i.test(texto);
          if (esTituloSeccion && texto.length > 40) continue;
          
          const tipo = detectarTipoCampo('', texto);
          const codigo = `CAMPO-${sheetName.toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, '')}-${orden}`;
          
          // Evitar duplicados
          const yaExiste = campos.some(c => c.pregunta === texto);
          if (yaExiste) continue;
          
          campos.push({
            plantilla_id: plantillaId,
            codigo: codigo.replace(/[^A-Z0-9-]/g, '-'),
            pregunta: texto,
            descripcion: `Campo extraído de la hoja "${sheetName}"`,
            hoja_excel: sheetName,
            celda_excel: `${String.fromCharCode(65 + col)}${i + 1}`,
            area_seccion: areaSeccion,
            tipo: tipo,
            configuracion: {
              requerido: false,
              placeholder: `Ingrese ${texto.toLowerCase()}`
            },
            rol_asignado: 'ANALISTA',
            orden: orden++
          });
        }
      }
    }
  }
  
  return campos;
}

/**
 * Obtiene el ID de una plantilla por su nombre de archivo
 */
async function obtenerPlantillaIdPorArchivo(nombreArchivo) {
  // Normalizar nombre para buscar
  const nombreSinExt = basename(nombreArchivo, extname(nombreArchivo));
  const codigoBusqueda = nombreSinExt
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toUpperCase()
    .substring(0, 50);
  
  // Buscar por código o nombre
  const { data: plantillas, error } = await supabase
    .from('plantillas_documento')
    .select('id, codigo, nombre')
    .eq('activa', true)
    .or(`codigo.ilike.%${codigoBusqueda}%,nombre.ilike.%${nombreSinExt}%`);
  
  if (error) {
    throw new Error(`Error buscando plantilla: ${error.message}`);
  }
  
  if (!plantillas || plantillas.length === 0) {
    return null;
  }
  
  // Intentar match exacto primero
  const matchExacto = plantillas.find(p => 
    p.codigo.toUpperCase() === codigoBusqueda ||
    p.nombre.toLowerCase() === nombreSinExt.toLowerCase()
  );
  
  return matchExacto ? matchExacto.id : plantillas[0].id;
}

/**
 * Crea campos en la base de datos
 */
async function crearCamposEnBD(campos) {
  if (campos.length === 0) return;
  
  console.log(`   📝 Creando ${campos.length} campo(s) en BD...`);
  
  // Insertar en lotes de 50
  const lotes = [];
  for (let i = 0; i < campos.length; i += 50) {
    lotes.push(campos.slice(i, i + 50));
  }
  
  let totalCreados = 0;
  let totalActualizados = 0;
  
  for (const lote of lotes) {
    // Verificar cuáles ya existen
    const codigos = lote.map(c => c.codigo);
    const { data: existentes } = await supabase
      .from('campos_plantilla')
      .select('id, codigo')
      .in('codigo', codigos);
    
    const codigosExistentes = new Set((existentes || []).map(e => e.codigo));
    const nuevos = lote.filter(c => !codigosExistentes.has(c.codigo));
    const paraActualizar = lote.filter(c => codigosExistentes.has(c.codigo));
    
    // Insertar nuevos
    if (nuevos.length > 0) {
      const { error: insertError } = await supabase
        .from('campos_plantilla')
        .insert(nuevos);
      
      if (insertError) {
        console.error(`   ❌ Error insertando campos: ${insertError.message}`);
      } else {
        totalCreados += nuevos.length;
      }
    }
    
    // Actualizar existentes (solo si es necesario)
    // Por ahora, solo creamos nuevos para evitar sobrescribir configuraciones manuales
    totalActualizados += paraActualizar.length;
  }
  
  console.log(`   ✅ ${totalCreados} campo(s) creado(s), ${totalActualizados} ya existían`);
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  try {
    console.log('🚀 Iniciando extracción de campos de plantillas...\n');
    
    // Leer archivos Excel
    const archivos = readdirSync(PLANTILLAS_DIR)
      .filter(f => ['.xlsx', '.xls'].includes(extname(f).toLowerCase()));
    
    if (archivos.length === 0) {
      console.log('⚠️  No se encontraron archivos Excel en la carpeta plantillas');
      return;
    }
    
    console.log(`📁 Encontrados ${archivos.length} archivo(s) Excel\n`);
    
    for (const archivo of archivos) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 Procesando: ${archivo}`);
      console.log('='.repeat(80));
      
      try {
        // 1. Obtener ID de plantilla en BD
        const plantillaId = await obtenerPlantillaIdPorArchivo(archivo);
        
        if (!plantillaId) {
          console.log(`   ⚠️  No se encontró plantilla en BD para "${archivo}"`);
          console.log(`   💡 Asegúrate de haber ejecutado upload-plantillas.js primero`);
          continue;
        }
        
        console.log(`   ✅ Plantilla encontrada en BD (ID: ${plantillaId})`);
        
        // 2. Leer archivo Excel
        const filePath = join(PLANTILLAS_DIR, archivo);
        const workbook = XLSX.readFile(filePath);
        
        console.log(`   📑 Hojas encontradas: ${workbook.SheetNames.length}`);
        
        // 3. Extraer campos de cada hoja
        let todosLosCampos = [];
        
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const campos = extraerCamposDeHoja(sheet, sheetName, plantillaId);
          
          console.log(`   📋 Hoja "${sheetName}": ${campos.length} campo(s) extraído(s)`);
          todosLosCampos = todosLosCampos.concat(campos);
        }
        
        // 4. Crear campos en BD
        if (todosLosCampos.length > 0) {
          await crearCamposEnBD(todosLosCampos);
        } else {
          console.log(`   ⚠️  No se pudieron extraer campos de "${archivo}"`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error procesando ${archivo}:`, error.message);
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