-- Eliminar usuario ramiroavila999@gmail.com y todos sus datos
-- Ejecutar este script PRIMERO antes de eliminar desde el Dashboard
DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
  v_nuevo_creador UUID;
BEGIN
  -- Obtener ID del usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'ramiroavila999@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario ramiroavila999@gmail.com no encontrado en auth.users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Eliminando datos del usuario: %', v_user_id;
  
  -- Deshabilitar RLS temporalmente para poder eliminar
  ALTER TABLE historial_valores_campo DISABLE ROW LEVEL SECURITY;
  ALTER TABLE valores_campo DISABLE ROW LEVEL SECURITY;
  ALTER TABLE documentos_instancia DISABLE ROW LEVEL SECURITY;
  ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
  
  -- Eliminar en orden (respetando foreign keys)
  -- 1. Historial editado por el usuario
  DELETE FROM historial_valores_campo WHERE cambiado_por = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % registros de historial_valores_campo (cambiado_por)', v_count;
  
  -- 2. Historial de valores de documentos del usuario
  DELETE FROM historial_valores_campo 
  WHERE valor_campo_id IN (
    SELECT vc.id 
    FROM valores_campo vc
    INNER JOIN documentos_instancia di ON di.id = vc.documento_instancia_id
    WHERE di.creado_por = v_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % registros de historial_valores_campo (documentos)', v_count;
  
  -- 3. Valores editados por el usuario (aunque no sea el creador del documento)
  DELETE FROM valores_campo WHERE editado_por = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % valores_campo (editado_por)', v_count;
  
  -- 4. Valores de campos de documentos del usuario
  DELETE FROM valores_campo 
  WHERE documento_instancia_id IN (
    SELECT id FROM documentos_instancia WHERE creado_por = v_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % valores_campo (documentos)', v_count;
  
  -- 5. Documentos instancia creados por el usuario
  DELETE FROM documentos_instancia WHERE creado_por = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % documentos_instancia', v_count;
  
  -- 6. Campos de plantilla creados por el usuario (si los hay)
  -- Nota: Los campos generalmente no tienen creado_por, pero verificamos por si acaso
  
  -- 7. Plantillas creadas por el usuario - REASIGNAR a otro usuario en lugar de eliminar
  -- Buscar otro usuario ADMIN o el primer usuario disponible
  SELECT id INTO v_nuevo_creador
  FROM user_profiles
  WHERE rol_profesional = 'ADMIN' AND id != v_user_id
  LIMIT 1;
  
  IF v_nuevo_creador IS NULL THEN
    SELECT id INTO v_nuevo_creador
    FROM user_profiles
    WHERE id != v_user_id
    LIMIT 1;
  END IF;
  
  IF v_nuevo_creador IS NOT NULL THEN
    -- Reasignar plantillas a otro usuario
    UPDATE plantillas_documento 
    SET creado_por = v_nuevo_creador
    WHERE creado_por = v_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Reasignadas % plantillas_documento al usuario %', v_count, v_nuevo_creador;
  ELSE
    RAISE NOTICE 'No se encontró otro usuario para reasignar plantillas. Las plantillas se mantendrán.';
  END IF;
  
  -- 8. Perfil de usuario
  DELETE FROM user_profiles WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Eliminado perfil de usuario (filas: %)', v_count;
  
  -- Rehabilitar RLS
  ALTER TABLE historial_valores_campo ENABLE ROW LEVEL SECURITY;
  ALTER TABLE valores_campo ENABLE ROW LEVEL SECURITY;
  ALTER TABLE documentos_instancia ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ Todos los datos del usuario eliminados. Ahora puedes eliminar desde el Dashboard.';
END $$;

