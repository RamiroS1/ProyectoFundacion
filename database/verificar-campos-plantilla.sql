-- Verificar campos por plantilla
-- Ejecutar en Supabase SQL Editor

SELECT 
  p.id as plantilla_id,
  p.nombre as plantilla_nombre,
  p.codigo as plantilla_codigo,
  COUNT(cp.id) as total_campos,
  COUNT(CASE WHEN cp.rol_asignado = 'ANALISTA' THEN 1 END) as campos_analista,
  COUNT(CASE WHEN cp.rol_asignado = 'DIRECTOR' THEN 1 END) as campos_director,
  COUNT(CASE WHEN cp.rol_asignado = 'COORDINADOR' THEN 1 END) as campos_coordinador,
  COUNT(CASE WHEN cp.rol_asignado = 'ADMIN' THEN 1 END) as campos_admin
FROM plantillas_documento p
LEFT JOIN campos_plantilla cp ON cp.plantilla_id = p.id
WHERE p.activa = true
GROUP BY p.id, p.nombre, p.codigo
ORDER BY p.nombre;

-- Ver campos de una plantilla específica (reemplaza el ID)
-- SELECT cp.*, p.nombre as plantilla_nombre
-- FROM campos_plantilla cp
-- INNER JOIN plantillas_documento p ON p.id = cp.plantilla_id
-- WHERE cp.plantilla_id = 'ID_DE_LA_PLANTILLA_AQUI'
-- ORDER BY cp.orden;

