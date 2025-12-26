-- ============================================================================
-- SCRIPT: Configuración inicial de plantilla
-- Ejecutar después de crear el schema para asegurar que haya una plantilla
-- activa disponible para nuevos usuarios
-- ============================================================================

-- Verificar si ya existe una plantilla activa
DO $$
DECLARE
  plantilla_existente_id UUID;
  admin_id UUID;
BEGIN
  -- Buscar una plantilla activa
  SELECT id INTO plantilla_existente_id
  FROM plantillas_documento
  WHERE activa = true
  LIMIT 1;
  
  -- Si no existe, crear una plantilla básica
  IF plantilla_existente_id IS NULL THEN
    -- Buscar un usuario admin o el primer usuario disponible
    SELECT id INTO admin_id
    FROM user_profiles
    WHERE rol_profesional = 'ADMIN'
    LIMIT 1;
    
    -- Si no hay admin, usar el primer usuario
    IF admin_id IS NULL THEN
      SELECT id INTO admin_id
      FROM user_profiles
      ORDER BY creado_en ASC
      LIMIT 1;
    END IF;
    
    -- Si no hay usuarios, usar el usuario actual si es admin, o crear sin creado_por
    -- Nota: Esto requiere permisos especiales, mejor esperar a que haya un usuario
    IF admin_id IS NULL THEN
      RAISE NOTICE 'No hay usuarios en el sistema. La plantilla se creará cuando se registre el primer usuario o cuando un administrador la cree manualmente.';
      RETURN;
    END IF;
    
    -- Crear plantilla con creado_por
    INSERT INTO plantillas_documento (
      codigo,
      nombre,
      descripcion,
      archivo_url,
      archivo_tipo,
      archivo_version,
      creado_por,
      activa
    )
    VALUES (
      'F15.GO6.PP',
      'FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS',
      'Formato de caracterización para distribución de áreas',
      '',
      'excel',
      '1.0.0',
      admin_id,
      true
    )
    RETURNING id INTO plantilla_existente_id;
    
    RAISE NOTICE 'Plantilla creada con ID: %', plantilla_existente_id;
  ELSE
    RAISE NOTICE 'Ya existe una plantilla activa con ID: %', plantilla_existente_id;
  END IF;
END $$;

-- Verificar el resultado
SELECT 
  id,
  codigo,
  nombre,
  activa
FROM plantillas_documento
WHERE activa = true
ORDER BY creado_en DESC
LIMIT 5;

