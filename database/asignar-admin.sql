-- Asignar rol ADMIN a ramirooavilaa7@gmail.com (UUID: 7bdeec8d-5d43-4196-94a5-d89cf11afbbf)
-- Si el perfil no existe, lo crea
DO $$
DECLARE
  v_user_id UUID := '7bdeec8d-5d43-4196-94a5-d89cf11afbbf'::uuid;
  v_email TEXT;
  v_nombre TEXT;
BEGIN
  -- Obtener email del usuario desde auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'nombre_completo', email, 'Usuario') 
  INTO v_email, v_nombre
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuario con ID % no existe en auth.users', v_user_id;
  END IF;
  
  -- Crear perfil si no existe, o actualizar si existe
  INSERT INTO user_profiles (id, email, nombre_completo, rol_profesional, activo)
  VALUES (v_user_id, v_email, v_nombre, 'ADMIN'::rol_profesional, true)
  ON CONFLICT (id) 
  DO UPDATE SET 
    rol_profesional = 'ADMIN'::rol_profesional,
    activo = true;
  
  RAISE NOTICE 'Perfil actualizado para usuario % con rol ADMIN', v_email;
END $$;

