-- Verificar plantillas y acceso
SELECT 
  p.id,
  p.codigo,
  p.nombre,
  p.activa,
  COUNT(cp.id) as total_campos
FROM plantillas_documento p
LEFT JOIN campos_plantilla cp ON cp.plantilla_id = p.id
GROUP BY p.id, p.codigo, p.nombre, p.activa
ORDER BY p.nombre;

-- Verificar rol del usuario actual
SELECT 
  id,
  email,
  rol_profesional,
  activo
FROM user_profiles
WHERE email = 'ramiroavila999@gmail.com';

