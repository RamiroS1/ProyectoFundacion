-- Script SQL para asignar un documento a un usuario
-- Ejecutar en Supabase SQL Editor
-- 
-- PASO 1: Buscar o identificar el usuario
-- PASO 2: Buscar o crear una plantilla
-- PASO 3: Crear documento instancia
-- PASO 4: Verificar campos asignados

-- ============================================================================
-- PASO 1: Verificar usuario (cambiar el email según corresponda)
-- ============================================================================
SELECT 
  id,
  email,
  nombre_completo,
  rol_profesional
FROM user_profiles
WHERE email = 'ramiroavila999@gmail.com';

-- Si no existe, primero necesitas crear el usuario en auth.users
-- o usar el trigger que lo crea automáticamente

-- ============================================================================
-- PASO 2: Verificar plantillas disponibles
-- ============================================================================
SELECT 
  id,
  codigo,
  nombre,
  activa
FROM plantillas_documento
WHERE activa = true
ORDER BY creado_en DESC
LIMIT 5;

-- Si no hay plantillas, crear una:
-- INSERT INTO plantillas_documento (codigo, nombre, descripcion, archivo_url, archivo_tipo, archivo_version, creado_por, activa)
-- VALUES (
--   'F15.GO6.PP',
--   'FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS',
--   'Formato de caracterización para distribución de áreas',
--   '',
--   'excel',
--   '1.0.0',
--   (SELECT id FROM user_profiles WHERE email = 'ramiroavila999@gmail.com' LIMIT 1),
--   true
-- )
-- RETURNING *;

-- ============================================================================
-- PASO 3: Crear documento instancia
-- ============================================================================
-- IMPORTANTE: Reemplaza el UUID del usuario y plantilla con los valores reales

WITH usuario_info AS (
  SELECT id as usuario_id
  FROM user_profiles
  WHERE email = 'ramiroavila999@gmail.com'
  LIMIT 1
),
plantilla_info AS (
  SELECT id as plantilla_id
  FROM plantillas_documento
  WHERE activa = true
  ORDER BY creado_en DESC
  LIMIT 1
)
INSERT INTO documentos_instancia (
  plantilla_id,
  numero_documento,
  titulo,
  estado,
  creado_por
)
SELECT 
  p.plantilla_id,
  'DOC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0'),
  'Formato de Caracterización - Instancia 1',
  'BORRADOR',
  u.usuario_id
FROM usuario_info u
CROSS JOIN plantilla_info p
WHERE u.usuario_id IS NOT NULL AND p.plantilla_id IS NOT NULL
RETURNING *;

-- ============================================================================
-- PASO 4: Verificar que el documento se creó correctamente
-- ============================================================================
SELECT 
  d.id,
  d.numero_documento,
  d.titulo,
  d.estado,
  p.nombre as plantilla_nombre,
  u.email as creado_por_email
FROM documentos_instancia d
JOIN plantillas_documento p ON d.plantilla_id = p.id
JOIN user_profiles u ON d.creado_por = u.id
WHERE u.email = 'ramiroavila999@gmail.com'
ORDER BY d.creado_en DESC
LIMIT 5;

-- ============================================================================
-- PASO 5 (Opcional): Verificar campos asignados al usuario
-- ============================================================================
-- Los campos se verán automáticamente si:
-- 1. Existen campos_plantilla para la plantilla
-- 2. El rol_asignado del campo coincide con el rol_profesional del usuario

SELECT 
  cp.id,
  cp.codigo,
  cp.pregunta,
  cp.area_seccion,
  cp.rol_asignado,
  cp.tipo
FROM campos_plantilla cp
JOIN plantillas_documento p ON cp.plantilla_id = p.id
JOIN documentos_instancia d ON d.plantilla_id = p.id
JOIN user_profiles u ON d.creado_por = u.id
WHERE u.email = 'ramiroavila999@gmail.com'
  AND cp.rol_asignado = (SELECT rol_profesional FROM user_profiles WHERE email = 'ramiroavila999@gmail.com')
ORDER BY cp.orden;

