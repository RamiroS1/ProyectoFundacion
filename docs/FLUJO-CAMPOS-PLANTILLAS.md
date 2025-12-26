# 📋 Flujo Completo: Campos de Plantillas en las Tablas

## 🎯 Visión General

Este documento explica cómo funcionan los campos de plantillas en el sistema, desde la extracción del Excel hasta su uso en el frontend.

## 📊 Estructura de Tablas

### 1. `plantillas_documento`
**Propósito**: Almacena las plantillas base (archivos Excel/Word)

```sql
plantillas_documento
├── id (UUID) - Identificador único
├── codigo (TEXT) - Código único de la plantilla (ej: "F15.GO6.PP")
├── nombre (TEXT) - Nombre descriptivo
├── archivo_url (TEXT) - URL del archivo en Supabase Storage
├── archivo_tipo (TEXT) - 'excel' o 'word'
└── activa (BOOLEAN) - Si está activa
```

**Ejemplo**:
```
id: 043a3ed2-1492-46eb-816d-df7a1f0f689e
codigo: F15.GO6.PP
nombre: FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS
archivo_url: https://.../FORMATO_DE_CARACTERIZACION.xlsx
archivo_tipo: excel
activa: true
```

### 2. `campos_plantilla`
**Propósito**: Almacena los campos/preguntas extraídos de cada plantilla

```sql
campos_plantilla
├── id (UUID) - Identificador único
├── plantilla_id (UUID) → plantillas_documento.id
├── codigo (TEXT) - Código único del campo (ej: "CAMPO-FORMATO-1")
├── pregunta (TEXT) - Texto de la pregunta/campo
├── tipo (tipo_campo) - 'texto', 'numero', 'fecha', 'textarea', 'seleccion'
├── configuracion (JSONB) - Configuración del campo
├── rol_asignado (rol_profesional) - Rol que puede editar este campo
├── hoja_excel (TEXT) - Nombre de la hoja Excel
├── celda_excel (TEXT) - Referencia de celda (ej: "B5")
├── area_seccion (TEXT) - Sección del documento (ej: "DATOS GENERALES")
└── orden (INTEGER) - Orden de visualización
```

**Ejemplo**:
```json
{
  "id": "abc-123",
  "plantilla_id": "043a3ed2-1492-46eb-816d-df7a1f0f689e",
  "codigo": "CAMPO-FORMATO-1",
  "pregunta": "Nombre del Proyecto",
  "tipo": "texto",
  "configuracion": {
    "requerido": false,
    "placeholder": "Ingrese el nombre del proyecto"
  },
  "rol_asignado": "ANALISTA",
  "hoja_excel": "FORMATO",
  "celda_excel": "B5",
  "area_seccion": "DATOS GENERALES",
  "orden": 1
}
```

### 3. `documentos_instancia`
**Propósito**: Instancias reales de documentos creados por usuarios

```sql
documentos_instancia
├── id (UUID) - Identificador único
├── plantilla_id (UUID) → plantillas_documento.id
├── numero_documento (TEXT) - Número único (ej: "DOC-20241225-001")
├── titulo (TEXT) - Título del documento
├── estado (estado_documento) - 'BORRADOR', 'EN_PROCESO', 'COMPLETADO'
├── creado_por (UUID) → auth.users.id
└── archivo_generado_url (TEXT) - URL del documento final generado
```

**Ejemplo**:
```json
{
  "id": "doc-456",
  "plantilla_id": "043a3ed2-1492-46eb-816d-df7a1f0f689e",
  "numero_documento": "DOC-20241225-001",
  "titulo": "Caracterización Centro de Apoyo - 2024",
  "estado": "EN_PROCESO",
  "creado_por": "user-789"
}
```

### 4. `valores_campo`
**Propósito**: Valores reales que los usuarios ingresan para cada campo

```sql
valores_campo
├── id (UUID) - Identificador único
├── documento_instancia_id (UUID) → documentos_instancia.id
├── campo_plantilla_id (UUID) → campos_plantilla.id
├── valor (JSONB) - Valor del campo (puede ser string, number, array, object)
├── estado (estado_campo) - 'PENDIENTE', 'EN_PROCESO', 'COMPLETADO'
├── editado_por (UUID) → auth.users.id
└── metadata (JSONB) - Datos adicionales (firma digital, etc.)
```

**Ejemplo**:
```json
{
  "id": "valor-789",
  "documento_instancia_id": "doc-456",
  "campo_plantilla_id": "abc-123",
  "valor": "Proyecto de Inclusión Social 2024",
  "estado": "COMPLETADO",
  "editado_por": "user-789",
  "metadata": {}
}
```

## 🔄 Flujo Completo

### Paso 1: Subir Plantilla a Storage
```bash
npm run upload-plantillas
```

**Qué hace**:
1. Lee archivos Excel de `plantillas/`
2. Sube cada archivo a Supabase Storage (bucket `plantillas`)
3. Crea registro en `plantillas_documento` con la URL del archivo

**Resultado**: Plantilla disponible en Storage y registrada en BD

### Paso 2: Extraer Campos del Excel
```bash
npm run extract-campos
```

**Qué hace**:
1. Lee cada plantilla Excel desde `plantillas/`
2. Para cada hoja del Excel:
   - Filtra hojas de lista/referencia
   - Extrae campos reales (encabezados o pregunta-respuesta)
   - Detecta tipo de campo automáticamente
   - Identifica secciones/áreas
3. Crea registros en `campos_plantilla` para cada campo encontrado

**Estrategias de extracción**:
- **Estrategia 1**: Encabezados de columnas (primera fila)
- **Estrategia 2**: Patrón pregunta-respuesta (columna A = pregunta, B = respuesta)

**Filtros aplicados**:
- Excluye hojas con nombres como "lista", "listas", "código"
- Excluye hojas con más de 500 filas (listas de datos)
- Excluye campos que son títulos de sección
- Excluye campos muy largos (>80 caracteres)

**Resultado**: Campos extraídos y almacenados en `campos_plantilla`

### Paso 3: Usuario Crea Documento
**En el frontend**: Usuario hace clic en una plantilla

**Qué pasa**:
1. Se llama a `documentoInstanciaService.findOrCreateDocumento(plantillaId)`
2. Busca si ya existe una instancia para ese usuario y plantilla
3. Si no existe, crea nueva instancia en `documentos_instancia`
4. Retorna el `documento_instancia_id`

**Resultado**: Instancia de documento creada (sin valores aún)

### Paso 4: Cargar Campos para Edición
**En el frontend**: Se abre el editor de documento

**Qué pasa**:
1. Se llama a `campoPlantillaService.getCamposByPlantilla(plantillaId)`
2. RLS filtra automáticamente: solo campos asignados al rol del usuario
3. Se organizan por `area_seccion` para crear tabs
4. Se ordenan por `orden`

**Resultado**: Campos disponibles para editar (según rol del usuario)

### Paso 5: Usuario Ingresa Valores
**En el frontend**: Usuario llena los campos y hace clic en "Guardar"

**Qué pasa**:
1. Se llama a `valorCampoService.save(valorData)`
2. Si el valor no existe: INSERT en `valores_campo`
3. Si el valor existe: UPDATE en `valores_campo`
4. RLS verifica que el usuario tenga permiso para editar ese campo

**Resultado**: Valor guardado en `valores_campo`

### Paso 6: Visualización
**En el frontend**: Se muestran los campos con sus valores

**Qué pasa**:
1. Se cargan campos de `campos_plantilla` (filtrados por rol)
2. Se cargan valores de `valores_campo` para ese documento
3. Se combinan para mostrar formulario completo

**Resultado**: Usuario ve y edita solo los campos de su rol

## 🔐 Seguridad (RLS)

### Políticas Aplicadas

1. **plantillas_documento**:
   - Usuarios ven solo plantillas que tienen campos asignados a su rol

2. **campos_plantilla**:
   - Usuarios ven solo campos donde `rol_asignado = su_rol`

3. **documentos_instancia**:
   - Usuarios ven documentos que crearon O que tienen campos asignados a su rol

4. **valores_campo**:
   - Usuarios ven/editan solo valores de campos asignados a su rol

## 📝 Ejemplo Completo

### 1. Plantilla en BD
```sql
plantillas_documento:
  id: "plantilla-1"
  nombre: "FORMATO DE CARACTERIZACION"
```

### 2. Campos Extraídos
```sql
campos_plantilla:
  - id: "campo-1", pregunta: "Nombre del Proyecto", rol_asignado: "ANALISTA"
  - id: "campo-2", pregunta: "Ubicación", rol_asignado: "ANALISTA"
  - id: "campo-3", pregunta: "Presupuesto", rol_asignado: "COORDINADOR"
```

### 3. Usuario Crea Documento
```sql
documentos_instancia:
  id: "doc-1"
  plantilla_id: "plantilla-1"
  creado_por: "user-analista"
```

### 4. Usuario Llena Campos
```sql
valores_campo:
  - documento_instancia_id: "doc-1", campo_plantilla_id: "campo-1", valor: "Proyecto X"
  - documento_instancia_id: "doc-1", campo_plantilla_id: "campo-2", valor: "Bogotá"
  (campo-3 no aparece porque es de COORDINADOR, no ANALISTA)
```

### 5. Resultado
- Usuario ANALISTA ve y edita solo campos 1 y 2
- Usuario COORDINADOR vería y editaría campo 3
- Cada rol ve solo sus campos asignados

## 🛠️ Comandos Útiles

```bash
# Subir plantillas a Storage
npm run upload-plantillas

# Extraer campos de plantillas
npm run extract-campos

# Verificar campos extraídos
node scripts/verificar-campos.js
```

## 📊 Relaciones entre Tablas

```
plantillas_documento (1) ──→ (N) campos_plantilla
     │                              │
     │                              │
     │                              │
     └──→ (N) documentos_instancia ─┘
                    │
                    │
                    └──→ (N) valores_campo
                              │
                              └──→ (1) campos_plantilla
```

## ⚠️ Notas Importantes

1. **Campos son inmutables**: Una vez creados, no se modifican (solo admin puede)
2. **Valores son editables**: Los usuarios pueden cambiar valores múltiples veces
3. **RLS es estricto**: Usuarios solo ven/editan lo que su rol permite
4. **Extracción automática**: El script hace su mejor esfuerzo, pero puede necesitar ajustes manuales

