-- ============================================================================
-- SISTEMA DE GESTIÓN DE DOCUMENTOS INSTITUCIONALES
-- Arquitectura: Plantillas inmutables + Campos con asignación por rol
-- ============================================================================

-- ============================================================================
-- LIMPIEZA (si es necesario migrar desde sistema anterior)
-- ============================================================================

-- Si ya existe user_profiles con estructura antigua, eliminarla primero
-- DROP TABLE IF EXISTS user_profiles CASCADE;
-- NOTA: Descomentar solo si necesitas empezar desde cero

-- ============================================================================
-- EXTENSIONES NECESARIAS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
ALTER DATABASE postgres SET row_security = on;

-- ============================================================================
-- ENUMERACIONES
-- ============================================================================

-- Roles profesionales en el sistema
DO $$ BEGIN
  CREATE TYPE rol_profesional AS ENUM (
    'DIRECTOR',
    'COORDINADOR',
    'ANALISTA',
    'AUDITOR',
    'GERENTE',
    'ADMIN'  -- Administrador del sistema
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipos de campo
DO $$ BEGIN
  CREATE TYPE tipo_campo AS ENUM (
    'texto',
    'numero',
    'fecha',
    'seleccion',
    'tabla',
    'firma',
    'textarea'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado de un campo
DO $$ BEGIN
  CREATE TYPE estado_campo AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'COMPLETADO',
    'REVISADO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado de una instancia de documento
DO $$ BEGIN
  CREATE TYPE estado_documento AS ENUM (
    'BORRADOR',
    'EN_PROCESO',
    'COMPLETADO',
    'FIRMADO',
    'ARCHIVADO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLA: user_profiles
-- Perfiles de usuario con rol profesional
-- ============================================================================

-- Eliminar tablas en orden correcto (respetando dependencias)
-- Nota: Las tablas se eliminan en orden inverso a sus dependencias
DROP TABLE IF EXISTS historial_valores_campo CASCADE;
DROP TABLE IF EXISTS valores_campo CASCADE;
DROP TABLE IF EXISTS documentos_instancia CASCADE;
DROP TABLE IF EXISTS campos_plantilla CASCADE;
DROP TABLE IF EXISTS plantillas_documento CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_completo TEXT,
  rol_profesional rol_profesional NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_user_profiles_rol ON user_profiles(rol_profesional) WHERE activo = true;
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con roles profesionales';
COMMENT ON COLUMN user_profiles.rol_profesional IS 'Rol profesional del usuario. Determina qué campos puede ver/editar';

-- ============================================================================
-- TABLA: plantillas_documento
-- Plantillas base INMUTABLES (Excel/Word institucionales)
-- NUNCA se modifican una vez creadas
-- ============================================================================

CREATE TABLE IF NOT EXISTS plantillas_documento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificación
  codigo TEXT NOT NULL UNIQUE, -- Ej: "INF-ANUAL-2024"
  nombre TEXT NOT NULL, -- Ej: "Informe Anual de Gestión 2024"
  descripcion TEXT,
  
  -- Archivo plantilla (Supabase Storage)
  archivo_url TEXT NOT NULL, -- URL del archivo en Supabase Storage
  archivo_tipo TEXT NOT NULL, -- 'excel' o 'word'
  archivo_version TEXT NOT NULL DEFAULT '1.0.0', -- Versión de la plantilla
  
  -- Metadata
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Plantillas son INMUTABLES - NO tienen updated_at
  activa BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT codigo_no_vacio CHECK (LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
  CONSTRAINT archivo_tipo_valido CHECK (archivo_tipo IN ('excel', 'word'))
);

CREATE INDEX idx_plantillas_activa ON plantillas_documento(activa) WHERE activa = true;
CREATE INDEX idx_plantillas_codigo ON plantillas_documento(codigo);

COMMENT ON TABLE plantillas_documento IS 'Plantillas base inmutables. SOLO ADMIN puede ver. Usuarios NUNCA ven plantillas completas';
COMMENT ON COLUMN plantillas_documento.archivo_url IS 'URL del archivo plantilla en Supabase Storage';
COMMENT ON COLUMN plantillas_documento.archivo_version IS 'Versión de la plantilla para control de cambios';

-- ============================================================================
-- TABLA: campos_plantilla
-- Campos/preguntas que componen una plantilla
-- Cada campo está asignado a un rol profesional
-- ============================================================================

CREATE TABLE IF NOT EXISTS campos_plantilla (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plantilla_id UUID NOT NULL REFERENCES plantillas_documento(id) ON DELETE CASCADE,
  
  -- Identificación del campo
  codigo TEXT NOT NULL, -- Ej: "CAMPO-001", referencia única en la plantilla (usado para mapeo en ensamblado)
  pregunta TEXT NOT NULL, -- Texto de la pregunta/prompt
  descripcion TEXT, -- Ayuda adicional
  
  -- Tipo y configuración
  tipo tipo_campo NOT NULL,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb, -- Opciones, validaciones, etc.
  
  -- Asignación por rol
  rol_asignado rol_profesional NOT NULL, -- Rol que puede ver/editar este campo
  
  -- Posición en Excel (para ensamblado)
  hoja_excel TEXT, -- Nombre de la hoja donde está el campo (ej: "FORMATO", "Formato")
  celda_excel TEXT, -- Referencia de celda Excel (ej: "B5", "C10") para mapeo en ensamblado
  area_seccion TEXT, -- Área o sección del documento (ej: "FASE I", "DATOS GENERALES")
  
  -- Orden y posición (para UI y ensamblado)
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT codigo_no_vacio CHECK (LENGTH(TRIM(codigo)) > 0),
  CONSTRAINT pregunta_no_vacio CHECK (LENGTH(TRIM(pregunta)) > 0),
  
  -- Unique: código único por plantilla
  UNIQUE(plantilla_id, codigo)
);

CREATE INDEX idx_campos_plantilla_id ON campos_plantilla(plantilla_id);
CREATE INDEX idx_campos_rol ON campos_plantilla(rol_asignado);
CREATE INDEX idx_campos_plantilla_rol ON campos_plantilla(plantilla_id, rol_asignado);
CREATE INDEX idx_campos_orden ON campos_plantilla(plantilla_id, orden);

COMMENT ON TABLE campos_plantilla IS 'Campos/preguntas de las plantillas. Cada campo está asignado a un rol profesional';
COMMENT ON COLUMN campos_plantilla.codigo IS 'Código único del campo en la plantilla (usado para mapear valores en el documento final, puede ser referencia de celda o nombre)';
COMMENT ON COLUMN campos_plantilla.rol_asignado IS 'Rol profesional que puede ver y editar este campo';
COMMENT ON COLUMN campos_plantilla.configuracion IS 'Configuración JSON: opciones para seleccion, validaciones, etc.';
COMMENT ON COLUMN campos_plantilla.hoja_excel IS 'Nombre de la hoja Excel donde está ubicado el campo (para ensamblado)';
COMMENT ON COLUMN campos_plantilla.celda_excel IS 'Referencia de celda Excel (ej: "B5") donde se insertará el valor (para ensamblado)';
COMMENT ON COLUMN campos_plantilla.area_seccion IS 'Área o sección del documento donde está el campo (para organización UI)';

-- ============================================================================
-- TABLA: documentos_instancia
-- Instancias reales de documentos (una por cada uso de una plantilla)
-- ============================================================================

CREATE TABLE IF NOT EXISTS documentos_instancia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plantilla_id UUID NOT NULL REFERENCES plantillas_documento(id) ON DELETE RESTRICT,
  
  -- Identificación
  numero_documento TEXT NOT NULL UNIQUE, -- Ej: "INF-ANUAL-2024-001"
  titulo TEXT NOT NULL,
  
  -- Estado y progreso
  estado estado_documento NOT NULL DEFAULT 'BORRADOR',
  
  -- Metadata
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_en TIMESTAMPTZ,
  
  -- Archivo generado (cuando esté completo)
  archivo_generado_url TEXT, -- URL del documento final generado
  
  CONSTRAINT titulo_no_vacio CHECK (LENGTH(TRIM(titulo)) > 0),
  CONSTRAINT numero_documento_no_vacio CHECK (LENGTH(TRIM(numero_documento)) > 0)
);

CREATE INDEX idx_docs_instancia_plantilla ON documentos_instancia(plantilla_id);
CREATE INDEX idx_docs_instancia_estado ON documentos_instancia(estado);
CREATE INDEX idx_docs_instancia_creado_por ON documentos_instancia(creado_por);
CREATE INDEX idx_docs_instancia_numero ON documentos_instancia(numero_documento);

COMMENT ON TABLE documentos_instancia IS 'Instancias reales de documentos. Usuarios ven solo instancias donde tienen campos asignados';
COMMENT ON COLUMN documentos_instancia.numero_documento IS 'Número único del documento para identificación institucional';
COMMENT ON COLUMN documentos_instancia.archivo_generado_url IS 'URL del documento final generado después del ensamblado';

-- ============================================================================
-- TABLA: valores_campo
-- Valores reales de los campos para cada instancia de documento
-- CRÍTICO: Esta es la tabla principal que los usuarios editan
-- ============================================================================

CREATE TABLE IF NOT EXISTS valores_campo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_instancia_id UUID NOT NULL REFERENCES documentos_instancia(id) ON DELETE CASCADE,
  campo_plantilla_id UUID NOT NULL REFERENCES campos_plantilla(id) ON DELETE CASCADE,
  
  -- Valor del campo (JSONB para flexibilidad)
  valor JSONB, -- Puede ser string, number, array, object según tipo_campo
  
  -- Estado del campo
  estado estado_campo NOT NULL DEFAULT 'PENDIENTE',
  
  -- Auditoría
  editado_por UUID NOT NULL REFERENCES auth.users(id),
  editado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb, -- Para datos adicionales (firma digital, etc.)
  
  -- Constraints
  CONSTRAINT valor_es_jsonb_valido CHECK (valor IS NULL OR jsonb_typeof(valor) IN ('string', 'number', 'boolean', 'array', 'object')),
  
  -- Unique: un solo valor por campo por instancia
  UNIQUE(documento_instancia_id, campo_plantilla_id)
);

CREATE INDEX idx_valores_documento ON valores_campo(documento_instancia_id);
CREATE INDEX idx_valores_campo ON valores_campo(campo_plantilla_id);
CREATE INDEX idx_valores_editado_por ON valores_campo(editado_por);
CREATE INDEX idx_valores_estado ON valores_campo(estado);
CREATE INDEX idx_valores_documento_estado ON valores_campo(documento_instancia_id, estado);

COMMENT ON TABLE valores_campo IS 'Valores reales de campos. Usuarios SOLO pueden ver/editar campos asignados a su rol';
COMMENT ON COLUMN valores_campo.valor IS 'Valor del campo en formato JSONB (flexible según tipo)';
COMMENT ON COLUMN valores_campo.estado IS 'Estado del campo: PENDIENTE, EN_PROCESO, COMPLETADO, REVISADO';

-- ============================================================================
-- TABLA: historial_valores_campo
-- Auditoría completa e inmutable de todos los cambios en valores
-- ============================================================================

CREATE TABLE IF NOT EXISTS historial_valores_campo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valor_campo_id UUID NOT NULL REFERENCES valores_campo(id) ON DELETE CASCADE,
  
  -- Valores anterior y nuevo
  valor_anterior JSONB,
  valor_nuevo JSONB,
  
  -- Estado anterior y nuevo
  estado_anterior estado_campo,
  estado_nuevo estado_campo,
  
  -- Auditoría
  version_numero INTEGER NOT NULL,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  rol_en_momento rol_profesional NOT NULL,
  cambiado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valor_anterior_jsonb CHECK (valor_anterior IS NULL OR jsonb_typeof(valor_anterior) IN ('string', 'number', 'boolean', 'array', 'object')),
  CONSTRAINT valor_nuevo_jsonb CHECK (valor_nuevo IS NULL OR jsonb_typeof(valor_nuevo) IN ('string', 'number', 'boolean', 'array', 'object'))
);

CREATE INDEX idx_historial_valor_campo_id ON historial_valores_campo(valor_campo_id);
CREATE INDEX idx_historial_cambiado_por ON historial_valores_campo(cambiado_por);
CREATE INDEX idx_historial_cambiado_en ON historial_valores_campo(cambiado_en DESC);
CREATE INDEX idx_historial_valor_version ON historial_valores_campo(valor_campo_id, version_numero DESC);

COMMENT ON TABLE historial_valores_campo IS 'Auditoría completa e inmutable de cambios en valores_campo';
COMMENT ON COLUMN historial_valores_campo.version_numero IS 'Número de versión secuencial para este campo';
COMMENT ON COLUMN historial_valores_campo.rol_en_momento IS 'Rol del usuario cuando hizo el cambio (para auditoría)';

-- ============================================================================
-- FUNCIONES HELPER PARA RLS
-- ============================================================================

-- Obtener rol profesional del usuario actual
CREATE OR REPLACE FUNCTION obtener_rol_profesional(user_id UUID)
RETURNS rol_profesional
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  rol_usuario rol_profesional;
BEGIN
  SELECT rol_profesional INTO rol_usuario
  FROM user_profiles
  WHERE id = user_id AND activo = true;
  
  RETURN COALESCE(rol_usuario, 'ANALISTA'::rol_profesional);
END;
$$;

-- Verificar si es administrador
CREATE OR REPLACE FUNCTION es_administrador(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN obtener_rol_profesional(user_id) = 'ADMIN'::rol_profesional;
END;
$$;

-- Verificar si usuario tiene acceso a un campo (por rol)
CREATE OR REPLACE FUNCTION usuario_tiene_acceso_campo(
  user_id UUID,
  campo_plantilla_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  rol_usuario rol_profesional;
  rol_campo rol_profesional;
BEGIN
  -- Administradores tienen acceso a todo
  IF es_administrador(user_id) THEN
    RETURN true;
  END IF;
  
  -- Obtener rol del usuario
  SELECT obtener_rol_profesional(user_id) INTO rol_usuario;
  
  -- Obtener rol asignado del campo
  SELECT rol_asignado INTO rol_campo
  FROM campos_plantilla
  WHERE id = campo_plantilla_id;
  
  -- Usuario tiene acceso si su rol coincide con el rol asignado del campo
  RETURN rol_usuario = rol_campo;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Actualizar timestamp de documentos_instancia
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_documentos_instancia ON documentos_instancia;
CREATE TRIGGER trigger_actualizar_documentos_instancia
  BEFORE UPDATE ON documentos_instancia
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_actualizar_user_profiles ON user_profiles;
CREATE TRIGGER trigger_actualizar_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

-- Crear historial antes de actualizar valores_campo
CREATE OR REPLACE FUNCTION crear_historial_valor_campo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  siguiente_version INTEGER;
  rol_actual rol_profesional;
BEGIN
  -- Obtener siguiente número de versión
  SELECT COALESCE(MAX(version_numero), 0) + 1
  INTO siguiente_version
  FROM historial_valores_campo
  WHERE valor_campo_id = NEW.id;
  
  -- Obtener rol del usuario actual
  SELECT obtener_rol_profesional(NEW.editado_por) INTO rol_actual;
  
  -- Crear entrada en historial solo si hubo cambios
  IF (OLD.valor IS DISTINCT FROM NEW.valor) OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    INSERT INTO historial_valores_campo (
      valor_campo_id,
      valor_anterior,
      valor_nuevo,
      estado_anterior,
      estado_nuevo,
      version_numero,
      cambiado_por,
      rol_en_momento
    ) VALUES (
      NEW.id,
      OLD.valor,
      NEW.valor,
      OLD.estado,
      NEW.estado,
      siguiente_version,
      NEW.editado_por,
      rol_actual
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_historial_valores_campo ON valores_campo;
CREATE TRIGGER trigger_historial_valores_campo
  BEFORE UPDATE ON valores_campo
  FOR EACH ROW
  WHEN (OLD.valor IS DISTINCT FROM NEW.valor OR OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION crear_historial_valor_campo();

-- Crear historial en INSERT (primera vez)
CREATE OR REPLACE FUNCTION crear_historial_valor_campo_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rol_actual rol_profesional;
BEGIN
  SELECT obtener_rol_profesional(NEW.editado_por) INTO rol_actual;
  
  INSERT INTO historial_valores_campo (
    valor_campo_id,
    valor_anterior,
    valor_nuevo,
    estado_anterior,
    estado_nuevo,
    version_numero,
    cambiado_por,
    rol_en_momento
  ) VALUES (
    NEW.id,
    NULL,
    NEW.valor,
    NULL,
    NEW.estado,
    1,
    NEW.editado_por,
    rol_actual
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_historial_valores_campo_insert ON valores_campo;
CREATE TRIGGER trigger_historial_valores_campo_insert
  AFTER INSERT ON valores_campo
  FOR EACH ROW
  EXECUTE FUNCTION crear_historial_valor_campo_insert();

-- Sincronizar perfil de usuario con auth.users y asignar documento inicial
-- Función helper para verificar si un usuario existe (para uso en políticas RLS)
CREATE OR REPLACE FUNCTION usuario_existe_en_auth(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  nuevo_perfil_id UUID;
BEGIN
  -- Crear perfil de usuario
  -- Usamos SECURITY DEFINER para ejecutar con privilegios del propietario de la función
  INSERT INTO user_profiles (id, email, nombre_completo, rol_profesional, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email, 'Usuario'),
    'ANALISTA'::rol_profesional,  -- Rol por defecto
    true
  )
  RETURNING id INTO nuevo_perfil_id;
  
  -- Nota: Por ahora NO creamos documentos_instancia automáticamente
  -- para simplificar y evitar problemas con RLS
  -- Esto se puede hacer manualmente o mediante otro proceso
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, loguear pero NO bloquear la creación del usuario
    RAISE WARNING 'Error en handle_new_user para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

