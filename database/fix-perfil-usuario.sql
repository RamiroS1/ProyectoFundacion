-- Crear/actualizar perfil del usuario 7bdeec8d-5d43-4196-94a5-d89cf11afbbf
DO $$
DECLARE
  v_user_id UUID := '7bdeec8d-5d43-4196-94a5-d89cf11afbbf'::uuid;
  v_email TEXT;
  v_nombre TEXT;
  v_perfil_existe BOOLEAN;
BEGIN
  -- Obtener datos del usuario desde auth.users
  SELECT 
    email, 
    COALESCE(raw_user_meta_data->>'nombre_completo', email, 'Usuario')
  INTO v_email, v_nombre
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuario con ID % no existe en auth.users', v_user_id;
  END IF;
  
  RAISE NOTICE 'Email: %, Nombre: %', v_email, v_nombre;
  
  -- Verificar si el perfil existe
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = v_user_id) INTO v_perfil_existe;
  
  IF v_perfil_existe THEN
    -- Actualizar perfil existente
    UPDATE user_profiles
    SET 
      email = v_email,
      nombre_completo = COALESCE(NULLIF(nombre_completo, ''), v_nombre),
      activo = true
    WHERE id = v_user_id;
    RAISE NOTICE 'Perfil actualizado';
  ELSE
    -- Crear nuevo perfil
    INSERT INTO user_profiles (id, email, nombre_completo, rol_profesional, activo)
    VALUES (v_user_id, v_email, v_nombre, 'ANALISTA'::rol_profesional, true);
    RAISE NOTICE 'Perfil creado';
  END IF;
END $$;

