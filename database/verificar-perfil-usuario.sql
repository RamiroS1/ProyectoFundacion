-- Verificar perfil del usuario 7bdeec8d-5d43-4196-94a5-d89cf11afbbf
SELECT 
  up.id,
  up.email,
  up.nombre_completo,
  up.rol_profesional,
  up.activo,
  up.creado_en,
  au.email as auth_email,
  au.raw_user_meta_data->>'nombre_completo' as nombre_en_metadata
FROM user_profiles up
FULL OUTER JOIN auth.users au ON au.id = up.id
WHERE up.id = '7bdeec8d-5d43-4196-94a5-d89cf11afbbf'::uuid
   OR au.id = '7bdeec8d-5d43-4196-94a5-d89cf11afbbf'::uuid;