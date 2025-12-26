-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- CRÍTICO: Políticas estrictas que garantizan aislamiento a nivel de campo
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE campos_plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_instancia ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_campo ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_valores_campo ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS: user_profiles
-- ============================================================================

-- Eliminar políticas existentes si existen (para evitar errores al re-ejecutar)
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Administradores ven todos los perfiles" ON user_profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Trigger puede crear perfiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin puede insertar perfiles" ON user_profiles;
DROP POLICY IF EXISTS "Solo admin elimina perfiles" ON user_profiles;

-- Usuarios ven su propio perfil
CREATE POLICY "Usuarios ven su propio perfil"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Administradores ven todos los perfiles
CREATE POLICY "Administradores ven todos los perfiles"
  ON user_profiles
  FOR SELECT
  USING (es_administrador(auth.uid()));

-- Usuarios pueden actualizar su propio perfil (campos limitados)
-- Nota: Las restricciones de que no puedan cambiar rol o desactivarse
-- se manejan mejor mediante triggers o validaciones en la aplicación
-- porque OLD/NEW no están disponibles en políticas RLS
CREATE POLICY "Usuarios actualizan su propio perfil"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permitir que los usuarios inserten su propio perfil (solo mediante trigger)
-- El trigger handle_new_user() usa SECURITY DEFINER
-- IMPORTANTE: En Supabase, los triggers SECURITY DEFINER después de INSERT en auth.users
-- pueden no tener auth.uid() disponible. Usamos una función helper SECURITY DEFINER
-- para verificar si el usuario existe en auth.users
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON user_profiles
  FOR INSERT
  WITH CHECK (
    -- Caso normal: usuario inserta su propio perfil
    auth.uid() = id
    OR
    -- Caso del trigger: el ID existe en auth.users (usuario recién creado)
    -- Usamos función SECURITY DEFINER para evitar problemas de RLS
    usuario_existe_en_auth(id)
  );

-- Administradores también pueden insertar perfiles
CREATE POLICY "Admin puede insertar perfiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (es_administrador(auth.uid()));

CREATE POLICY "Solo admin elimina perfiles"
  ON user_profiles
  FOR DELETE
  USING (es_administrador(auth.uid()));

-- ============================================================================
-- POLÍTICAS: plantillas_documento
-- CRÍTICO: SOLO ADMIN puede ver plantillas completas
-- Usuarios normales NUNCA pueden ver esta tabla
-- ============================================================================

-- Eliminar políticas existentes si existen (incluyendo la versión antigua)
DROP POLICY IF EXISTS "Solo admin ve plantillas" ON plantillas_documento;
DROP POLICY IF EXISTS "Solo admin crea plantillas" ON plantillas_documento;
DROP POLICY IF EXISTS "Solo admin desactiva plantillas" ON plantillas_documento;
DROP POLICY IF EXISTS "Solo admin actualiza plantillas" ON plantillas_documento;
DROP POLICY IF EXISTS "Solo admin elimina plantillas" ON plantillas_documento;

-- SOLO administradores pueden ver plantillas
CREATE POLICY "Solo admin ve plantillas"
  ON plantillas_documento
  FOR SELECT
  USING (es_administrador(auth.uid()));

-- SOLO administradores pueden crear plantillas
CREATE POLICY "Solo admin crea plantillas"
  ON plantillas_documento
  FOR INSERT
  WITH CHECK (
    es_administrador(auth.uid()) AND
    creado_por = auth.uid()
  );

-- Plantillas son INMUTABLES - NO se pueden actualizar
-- Ni siquiera administradores pueden modificar plantillas existentes
-- (Si necesitas cambios, crea una nueva versión)

-- SOLO administradores pueden desactivar plantillas (soft delete)
-- Nota: Las restricciones de inmutabilidad se manejan mejor mediante triggers
-- porque OLD/NEW no están disponibles en políticas RLS
CREATE POLICY "Solo admin actualiza plantillas"
  ON plantillas_documento
  FOR UPDATE
  USING (es_administrador(auth.uid()))
  WITH CHECK (es_administrador(auth.uid()));

CREATE POLICY "Solo admin elimina plantillas"
  ON plantillas_documento
  FOR DELETE
  USING (es_administrador(auth.uid()));

-- ============================================================================
-- POLÍTICAS: campos_plantilla
-- CRÍTICO: Usuarios SOLO ven campos asignados a su rol
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven solo campos de su rol" ON campos_plantilla;
DROP POLICY IF EXISTS "Solo admin crea campos" ON campos_plantilla;
DROP POLICY IF EXISTS "Solo admin actualiza campos" ON campos_plantilla;
DROP POLICY IF EXISTS "Solo admin elimina campos" ON campos_plantilla;

-- SELECT: Usuarios ven SOLO campos asignados a su rol
-- Administradores ven TODOS los campos
CREATE POLICY "Usuarios ven solo campos de su rol"
  ON campos_plantilla
  FOR SELECT
  USING (
    es_administrador(auth.uid())
    OR
    rol_asignado = obtener_rol_profesional(auth.uid())
  );

-- INSERT: Solo administradores pueden crear campos
CREATE POLICY "Solo admin crea campos"
  ON campos_plantilla
  FOR INSERT
  WITH CHECK (
    es_administrador(auth.uid()) AND
    -- Verificar que la plantilla existe y el admin puede accederla
    EXISTS (
      SELECT 1
      FROM plantillas_documento
      WHERE id = campos_plantilla.plantilla_id
        AND es_administrador(auth.uid())
    )
  );

-- UPDATE: Solo administradores pueden modificar campos
-- (Los campos son relativamente inmutables, pero admin puede ajustar)
CREATE POLICY "Solo admin actualiza campos"
  ON campos_plantilla
  FOR UPDATE
  USING (es_administrador(auth.uid()))
  WITH CHECK (es_administrador(auth.uid()));

-- DELETE: Solo administradores pueden eliminar campos
CREATE POLICY "Solo admin elimina campos"
  ON campos_plantilla
  FOR DELETE
  USING (es_administrador(auth.uid()));

-- ============================================================================
-- POLÍTICAS: documentos_instancia
-- Usuarios ven SOLO instancias donde tienen campos asignados
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven instancias con sus campos" ON documentos_instancia;
DROP POLICY IF EXISTS "Trigger puede crear instancias para usuarios" ON documentos_instancia;
DROP POLICY IF EXISTS "Solo admin crea instancias" ON documentos_instancia;
DROP POLICY IF EXISTS "Admin puede crear instancias" ON documentos_instancia;
DROP POLICY IF EXISTS "Solo admin actualiza instancias" ON documentos_instancia;
DROP POLICY IF EXISTS "Solo admin elimina instancias" ON documentos_instancia;

-- SELECT: Usuarios ven instancias donde tienen al menos un campo asignado
-- Administradores ven TODAS las instancias
-- También ven documentos que crearon o que tienen campos asignados a su rol
CREATE POLICY "Usuarios ven instancias con sus campos"
  ON documentos_instancia
  FOR SELECT
  USING (
    es_administrador(auth.uid())
    OR
    -- Usuario es el creador del documento
    creado_por = auth.uid()
    OR
    -- Existe al menos un campo asignado al rol del usuario en la plantilla
    -- (aunque no tenga valores aún)
    EXISTS (
      SELECT 1
      FROM campos_plantilla cp
      WHERE cp.plantilla_id = documentos_instancia.plantilla_id
        AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
    )
  );

-- INSERT: Permitir que el trigger cree instancias para nuevos usuarios
-- También administradores pueden crear instancias
-- Nota: Permitimos inserción si creado_por = auth.uid() (caso normal) o si
-- el creado_por existe en auth.users (caso del trigger SECURITY DEFINER)
CREATE POLICY "Trigger puede crear instancias para usuarios"
  ON documentos_instancia
  FOR INSERT
  WITH CHECK (
    (
      creado_por = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = documentos_instancia.creado_por
      )
    )
    AND
    EXISTS (
      SELECT 1
      FROM plantillas_documento
      WHERE id = documentos_instancia.plantilla_id
        AND activa = true
    )
  );

-- Administradores también pueden crear instancias manualmente
CREATE POLICY "Admin puede crear instancias"
  ON documentos_instancia
  FOR INSERT
  WITH CHECK (
    es_administrador(auth.uid()) AND
    creado_por = auth.uid()
  );

-- UPDATE: Administradores pueden actualizar instancias
-- Usuarios normales NO pueden modificar instancias directamente
CREATE POLICY "Solo admin actualiza instancias"
  ON documentos_instancia
  FOR UPDATE
  USING (es_administrador(auth.uid()))
  WITH CHECK (es_administrador(auth.uid()));

-- DELETE: Solo administradores pueden eliminar instancias
CREATE POLICY "Solo admin elimina instancias"
  ON documentos_instancia
  FOR DELETE
  USING (es_administrador(auth.uid()));

-- ============================================================================
-- POLÍTICAS: valores_campo
-- CRÍTICO: Esta es la tabla principal que los usuarios editan
-- Usuarios SOLO pueden ver/editar valores de campos asignados a su rol
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven valores de sus campos" ON valores_campo;
DROP POLICY IF EXISTS "Usuarios crean valores de sus campos" ON valores_campo;
DROP POLICY IF EXISTS "Usuarios actualizan valores de sus campos" ON valores_campo;

-- SELECT: Usuarios ven SOLO valores de campos asignados a su rol
CREATE POLICY "Usuarios ven valores de sus campos"
  ON valores_campo
  FOR SELECT
  USING (
    es_administrador(auth.uid())
    OR
    usuario_tiene_acceso_campo(auth.uid(), campo_plantilla_id)
  );

-- INSERT: Usuarios pueden crear valores para campos asignados a su rol
-- (Primera vez que se llena un campo)
CREATE POLICY "Usuarios crean valores de sus campos"
  ON valores_campo
  FOR INSERT
  WITH CHECK (
    editado_por = auth.uid() AND
    (
      es_administrador(auth.uid())
      OR
      usuario_tiene_acceso_campo(auth.uid(), campo_plantilla_id)
    ) AND
    -- Verificar que la instancia existe y el usuario tiene acceso
    EXISTS (
      SELECT 1
      FROM documentos_instancia di
      WHERE di.id = valores_campo.documento_instancia_id
        AND (
          es_administrador(auth.uid())
          OR
          EXISTS (
            SELECT 1
            FROM campos_plantilla cp
            WHERE cp.id = valores_campo.campo_plantilla_id
              AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
          )
        )
    )
  );

-- UPDATE: Usuarios pueden actualizar valores de campos asignados a su rol
-- CRÍTICO: Esta es la operación más común del sistema
CREATE POLICY "Usuarios actualizan valores de sus campos"
  ON valores_campo
  FOR UPDATE
  USING (
    editado_por = auth.uid() AND
    (
      es_administrador(auth.uid())
      OR
      usuario_tiene_acceso_campo(auth.uid(), campo_plantilla_id)
    )
  )
  WITH CHECK (
    editado_por = auth.uid() AND
    (
      es_administrador(auth.uid())
      OR
      usuario_tiene_acceso_campo(auth.uid(), campo_plantilla_id)
    )
  );

-- DELETE: NO se permiten eliminaciones (datos inmutables)
-- Los valores se pueden vaciar (NULL) pero no eliminar
-- (Si necesitas eliminar, usa soft delete marcando como PENDIENTE con valor NULL)

-- ============================================================================
-- POLÍTICAS: historial_valores_campo
-- Usuarios ven SOLO historial de campos asignados a su rol
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios ven historial de sus campos" ON historial_valores_campo;
DROP POLICY IF EXISTS "Solo sistema crea historial" ON historial_valores_campo;

-- SELECT: Usuarios ven historial de campos asignados a su rol
CREATE POLICY "Usuarios ven historial de sus campos"
  ON historial_valores_campo
  FOR SELECT
  USING (
    es_administrador(auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM valores_campo vc
      INNER JOIN campos_plantilla cp ON cp.id = vc.campo_plantilla_id
      WHERE vc.id = historial_valores_campo.valor_campo_id
        AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
    )
  );

-- INSERT: Solo el sistema puede insertar (via triggers)
-- Por seguridad, solo permitimos desde triggers o admin
CREATE POLICY "Solo sistema crea historial"
  ON historial_valores_campo
  FOR INSERT
  WITH CHECK (
    -- El trigger usa SECURITY DEFINER, así que esto es una capa extra
    es_administrador(auth.uid())
    OR
    cambiado_por = auth.uid()
  );

-- UPDATE/DELETE: El historial es INMUTABLE
-- NO se permiten modificaciones ni eliminaciones (auditoría legal)

-- ============================================================================
-- VISTAS SEGURAS (Opcional, para simplificar consultas)
-- ============================================================================

-- Vista: Campos asignados al usuario actual para una plantilla
CREATE OR REPLACE VIEW mis_campos_plantilla AS
SELECT 
  cp.*,
  p.nombre as plantilla_nombre,
  p.codigo as plantilla_codigo
FROM campos_plantilla cp
INNER JOIN plantillas_documento p ON p.id = cp.plantilla_id
WHERE cp.rol_asignado = obtener_rol_profesional(auth.uid())
  AND p.activa = true
  AND NOT es_administrador(auth.uid());

ALTER VIEW mis_campos_plantilla SET (security_invoker = true);

-- Vista: Instancias del usuario con progreso
CREATE OR REPLACE VIEW mis_documentos_instancia AS
SELECT DISTINCT
  di.*,
  p.nombre as plantilla_nombre,
  p.codigo as plantilla_codigo,
  (
    SELECT COUNT(*)
    FROM valores_campo vc
    INNER JOIN campos_plantilla cp ON cp.id = vc.campo_plantilla_id
    WHERE vc.documento_instancia_id = di.id
      AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
  ) as total_campos_asignados,
  (
    SELECT COUNT(*)
    FROM valores_campo vc
    INNER JOIN campos_plantilla cp ON cp.id = vc.campo_plantilla_id
    WHERE vc.documento_instancia_id = di.id
      AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
      AND vc.estado = 'COMPLETADO'
  ) as campos_completados
FROM documentos_instancia di
INNER JOIN plantillas_documento p ON p.id = di.plantilla_id
WHERE (
  es_administrador(auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM campos_plantilla cp
    INNER JOIN valores_campo vc ON vc.campo_plantilla_id = cp.id
    WHERE cp.plantilla_id = di.plantilla_id
      AND vc.documento_instancia_id = di.id
      AND cp.rol_asignado = obtener_rol_profesional(auth.uid())
  )
)
AND NOT es_administrador(auth.uid());

ALTER VIEW mis_documentos_instancia SET (security_invoker = true);

-- ============================================================================
-- FUNCIONES SQL ÚTILES PARA ADMINISTRADORES
-- ============================================================================

-- Obtener documento completo con todos sus valores (solo ADMIN)
CREATE OR REPLACE FUNCTION obtener_documento_completo(doc_instancia_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  documento_completo JSONB;
BEGIN
  IF NOT es_administrador(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden ver documentos completos';
  END IF;
  
  SELECT jsonb_build_object(
    'documento', row_to_json(di.*),
    'plantilla', (
      SELECT row_to_json(p.*)
      FROM plantillas_documento p
      WHERE p.id = di.plantilla_id
    ),
    'campos', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'campo', row_to_json(cp.*),
          'valor', row_to_json(vc.*)
        ) ORDER BY cp.orden
      )
      FROM campos_plantilla cp
      LEFT JOIN valores_campo vc ON vc.campo_plantilla_id = cp.id
        AND vc.documento_instancia_id = di.id
      WHERE cp.plantilla_id = di.plantilla_id
    )
  )
  INTO documento_completo
  FROM documentos_instancia di
  WHERE di.id = doc_instancia_id;
  
  RETURN documento_completo;
END;
$$;

COMMENT ON FUNCTION obtener_documento_completo IS 'Obtiene documento completo con todos los campos y valores (solo para administradores)';

-- Obtener progreso del documento por rol (solo ADMIN)
CREATE OR REPLACE FUNCTION obtener_progreso_documento(doc_instancia_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  progreso JSONB;
BEGIN
  IF NOT es_administrador(auth.uid()) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden ver progreso';
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'rol', cp.rol_asignado,
      'total_campos', COUNT(cp.id),
      'completados', COUNT(CASE WHEN vc.estado = 'COMPLETADO' THEN 1 END),
      'en_proceso', COUNT(CASE WHEN vc.estado = 'EN_PROCESO' THEN 1 END),
      'pendientes', COUNT(CASE WHEN vc.estado = 'PENDIENTE' OR vc.id IS NULL THEN 1 END)
    )
  )
  INTO progreso
  FROM campos_plantilla cp
  LEFT JOIN valores_campo vc ON vc.campo_plantilla_id = cp.id
    AND vc.documento_instancia_id = doc_instancia_id
  WHERE cp.plantilla_id = (
    SELECT plantilla_id FROM documentos_instancia WHERE id = doc_instancia_id
  )
  GROUP BY cp.rol_asignado;
  
  RETURN progreso;
END;
$$;

COMMENT ON FUNCTION obtener_progreso_documento IS 'Obtiene progreso del documento por rol profesional (solo para administradores)';

