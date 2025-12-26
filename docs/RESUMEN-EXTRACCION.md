# 📊 Resumen: Extracción de Campos de Plantillas

## ✅ Estado Actual

### Plantillas Procesadas

1. **FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS** (F15.GO6.PP)
   - ✅ 118 campos extraídos
   - Tipos: texto (111), textarea (2), fecha (3), numero (1), seleccion (1)
   - Secciones: DATOS GENERALES, CARACTERIZACIÓN, etc.

2. **Formato Plan Individual de Apoyo a la Inclusión**
   - ✅ 55 campos extraídos
   - Tipos: principalmente texto
   - Secciones: Formato, Instrucciones

3. **MATRIZ GARANTIA DE DERECHOS**
   - ✅ 59 campos extraídos
   - Tipos: principalmente texto
   - Secciones: Identificación de derechos, Orientaciones

4. **REPORTE MENSUAL**
   - ✅ 62 campos extraídos
   - Tipos: principalmente texto
   - Secciones: Hoja1, Hoja2

## 🔧 Cómo Funciona la Extracción

### Proceso Automático

```
Excel File
    ↓
[Leer con XLSX]
    ↓
[Para cada hoja]
    ↓
¿Es hoja de lista? → SÍ → ❌ Saltar
    ↓ NO
[Extraer campos]
    ↓
[Detectar tipo]
    ↓
[Identificar sección]
    ↓
[Crear en BD]
    ↓
✅ Campos listos
```

### Estrategias de Extracción

#### Estrategia 1: Encabezados de Columnas
- Busca encabezados en la primera fila
- Cada columna = un campo
- Límite: máximo 20 columnas (formularios típicos)

#### Estrategia 2: Patrón Pregunta-Respuesta
- Si hay pocos campos en Estrategia 1
- Busca en todas las filas
- Detecta texto que parece pregunta/campo
- Filtra títulos de sección

### Filtros Aplicados

✅ **Se excluyen**:
- Hojas con nombres: "lista", "listas", "código", "datos", etc.
- Hojas con más de 500 filas (listas de datos)
- Hojas con más de 30 columnas (tablas de referencia)
- Campos que son títulos de sección (FASE, PROCESO, etc.)
- Campos muy largos (>80 caracteres)
- Campos solo en mayúsculas (códigos)

✅ **Se incluyen**:
- Hojas "FORMATO", "INSTRUCTIVO" (aunque tengan nombres similares)
- Campos con texto entre 5-80 caracteres
- Campos que parecen preguntas reales

## 📋 Estructura en Base de Datos

### Tabla: `campos_plantilla`

Cada campo extraído se guarda con:

```sql
{
  plantilla_id: UUID,           -- ID de la plantilla
  codigo: "CAMPO-FORMATO-1",    -- Código único
  pregunta: "Nombre del Proyecto", -- Texto del campo
  tipo: "texto",                -- Tipo detectado
  configuracion: {...},         -- Configuración JSON
  rol_asignado: "ANALISTA",     -- Rol por defecto
  hoja_excel: "FORMATO",        -- Hoja de origen
  celda_excel: "B5",            -- Celda de referencia
  area_seccion: "DATOS GENERALES", -- Sección
  orden: 1                      -- Orden de visualización
}
```

## 🔄 Flujo Completo

### 1. Subir Plantilla
```bash
npm run upload-plantillas
```
→ Crea registro en `plantillas_documento`
→ Sube archivo a Supabase Storage

### 2. Extraer Campos
```bash
npm run extract-campos
```
→ Lee Excel desde `plantillas/`
→ Extrae campos automáticamente
→ Crea registros en `campos_plantilla`

### 3. Usuario Crea Documento
→ Se crea instancia en `documentos_instancia`
→ Usuario ve solo campos de su rol

### 4. Usuario Llena Valores
→ Se guardan en `valores_campo`
→ Cada valor está vinculado a un campo y documento

## 📊 Estadísticas

- **Total plantillas**: 6
- **Total campos extraídos**: ~300 campos
- **Tipos detectados**: texto, numero, fecha, textarea, seleccion
- **Roles asignados**: ANALISTA (por defecto, ajustable)

## ⚙️ Ajustes Manuales Recomendados

Después de la extracción automática, puedes ajustar:

1. **Roles asignados**: Cambiar de ANALISTA a otros roles según necesidad
2. **Campos requeridos**: Marcar campos importantes como requeridos
3. **Secciones**: Refinar nombres de secciones para mejor organización
4. **Tipos de campo**: Ajustar tipos si la detección automática falló
5. **Orden**: Reordenar campos para mejor UX

## 🐛 Problemas Conocidos

1. **Campos duplicados**: Pueden aparecer si el Excel tiene estructura irregular
   - Solución: El script evita duplicados por código

2. **Títulos como campos**: A veces se extraen títulos de sección
   - Solución: Filtros mejorados, pero puede necesitar limpieza manual

3. **Hojas de lista**: Algunas hojas de lista pueden pasar el filtro
   - Solución: Ajustar filtros en el script si es necesario

## ✅ Próximos Pasos

1. ✅ Campos extraídos y en BD
2. ✅ Frontend puede cargar campos
3. ⏳ Ajustar roles según necesidad
4. ⏳ Refinar secciones
5. ⏳ Probar flujo completo de edición

