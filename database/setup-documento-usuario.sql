-- ============================================================================
-- SCRIPT: Crear campos para la plantilla existente
-- Ejecutar este script para agregar campos a la plantilla F15.GO6.PP
-- Los campos estarán asignados al rol ANALISTA por defecto
-- ============================================================================

-- Crear campos para la plantilla existente
DO $$
DECLARE
  v_plantilla_id UUID;
BEGIN
  -- Buscar la plantilla existente
  SELECT id INTO v_plantilla_id
  FROM plantillas_documento
  WHERE codigo = 'F15.GO6.PP'
    AND activa = true
  LIMIT 1;
  
  IF v_plantilla_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la plantilla F15.GO6.PP activa. Por favor, ejecuta primero setup-inicial-plantilla.sql';
  END IF;
  
  RAISE NOTICE 'Usando plantilla con ID: %', v_plantilla_id;
  
  -- Crear campos de ejemplo para la plantilla (solo si no existen)
  IF NOT EXISTS (SELECT 1 FROM campos_plantilla WHERE plantilla_id = v_plantilla_id LIMIT 1) THEN
    -- Campo 1: Nombre del proyecto
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-001',
      'Nombre del Proyecto',
      'Ingrese el nombre completo del proyecto',
      'texto',
      '{"requerido": true, "placeholder": "Ej: Proyecto de Infraestructura"}'::jsonb,
      'ANALISTA',
      'DATOS GENERALES',
      1
    );
    
    -- Campo 2: Ubicación
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-002',
      'Ubicación del Proyecto',
      'Dirección o ubicación donde se desarrolla el proyecto',
      'textarea',
      '{"requerido": true, "filas": 3, "placeholder": "Ingrese la dirección completa"}'::jsonb,
      'ANALISTA',
      'DATOS GENERALES',
      2
    );
    
    -- Campo 3: Fecha de inicio
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-003',
      'Fecha de Inicio',
      'Fecha en que inició el proyecto',
      'fecha',
      '{"requerido": true}'::jsonb,
      'ANALISTA',
      'DATOS GENERALES',
      3
    );
    
    -- Campo 4: Área total
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-004',
      'Área Total (m²)',
      'Área total del proyecto en metros cuadrados',
      'numero',
      '{"requerido": true, "min": 0, "placeholder": "Ej: 1500"}'::jsonb,
      'ANALISTA',
      'DISTRIBUCION DE AREAS',
      4
    );
    
    -- Campo 5: Tipo de proyecto
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-005',
      'Tipo de Proyecto',
      'Seleccione el tipo de proyecto',
      'seleccion',
      '{"requerido": true, "opciones": [{"valor": "infraestructura", "etiqueta": "Infraestructura"}, {"valor": "educativo", "etiqueta": "Educativo"}, {"valor": "salud", "etiqueta": "Salud"}, {"valor": "residencial", "etiqueta": "Residencial"}]}'::jsonb,
      'ANALISTA',
      'DATOS GENERALES',
      5
    );
    
    -- Campo 6: Descripción general
    INSERT INTO campos_plantilla (
      plantilla_id,
      codigo,
      pregunta,
      descripcion,
      tipo,
      configuracion,
      rol_asignado,
      area_seccion,
      orden
    )
    VALUES (
      v_plantilla_id,
      'CAMPO-006',
      'Descripción General',
      'Descripción detallada del proyecto',
      'textarea',
      '{"requerido": false, "filas": 5, "placeholder": "Ingrese una descripción detallada del proyecto"}'::jsonb,
      'ANALISTA',
      'DATOS GENERALES',
      6
    );
    
    RAISE NOTICE 'Campos creados para la plantilla';
  ELSE
    RAISE NOTICE 'La plantilla ya tiene campos. No se crearán campos duplicados.';
  END IF;
END $$;

-- Verificar el resultado: campos creados
SELECT 
  cp.id,
  cp.codigo,
  cp.pregunta,
  cp.tipo,
  cp.area_seccion,
  cp.rol_asignado,
  cp.orden
FROM campos_plantilla cp
INNER JOIN plantillas_documento p ON p.id = cp.plantilla_id
WHERE p.codigo = 'F15.GO6.PP'
ORDER BY cp.orden;

-- Verificar documentos existentes
SELECT 
  di.id as documento_id,
  di.numero_documento,
  di.titulo,
  di.estado,
  up.email as usuario_email,
  up.nombre_completo,
  p.nombre as plantilla_nombre,
  (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = di.plantilla_id) as total_campos
FROM documentos_instancia di
INNER JOIN user_profiles up ON up.id = di.creado_por
INNER JOIN plantillas_documento p ON p.id = di.plantilla_id
WHERE p.codigo = 'F15.GO6.PP'
ORDER BY di.creado_en DESC
LIMIT 10;

