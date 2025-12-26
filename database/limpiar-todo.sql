-- ============================================================================
-- LIMPIAR TODO: Eliminar todas las tablas y datos
-- ⚠️ ADVERTENCIA: Esto elimina TODOS los datos
-- ============================================================================

DO $$
BEGIN
  -- Eliminar triggers primero (pueden referenciar tablas)
  DROP TRIGGER IF EXISTS trigger_historial_valores_campo ON valores_campo;
  DROP TRIGGER IF EXISTS trigger_historial_valores_campo_insert ON valores_campo;
  DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error eliminando triggers: %', SQLERRM;
END $$;

-- Eliminar tablas en orden (CASCADE elimina dependencias automáticamente)
DROP TABLE IF EXISTS historial_valores_campo CASCADE;
DROP TABLE IF EXISTS valores_campo CASCADE;
DROP TABLE IF EXISTS documentos_instancia CASCADE;
DROP TABLE IF EXISTS campos_plantilla CASCADE;
DROP TABLE IF EXISTS plantillas_documento CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Eliminar funciones
DO $$
BEGIN
  DROP FUNCTION IF EXISTS obtener_rol_profesional(UUID) CASCADE;
  DROP FUNCTION IF EXISTS es_administrador(UUID) CASCADE;
  DROP FUNCTION IF EXISTS es_tester(UUID) CASCADE;
  DROP FUNCTION IF EXISTS usuario_tiene_acceso_campo(UUID, UUID) CASCADE;
  DROP FUNCTION IF EXISTS usuario_existe_en_auth(UUID) CASCADE;
  DROP FUNCTION IF EXISTS crear_historial_valor_campo() CASCADE;
  DROP FUNCTION IF EXISTS crear_historial_valor_campo_insert() CASCADE;
  DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
  DROP FUNCTION IF EXISTS obtener_documento_completo(UUID) CASCADE;
  DROP FUNCTION IF EXISTS obtener_progreso_documento(UUID) CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error eliminando funciones: %', SQLERRM;
END $$;

-- Eliminar tipos ENUM
DO $$
BEGIN
  DROP TYPE IF EXISTS rol_profesional CASCADE;
  DROP TYPE IF EXISTS estado_documento CASCADE;
  DROP TYPE IF EXISTS estado_campo CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error eliminando tipos: %', SQLERRM;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Limpieza completada. Ahora ejecuta schema.sql y rls_policies.sql';
END $$;

