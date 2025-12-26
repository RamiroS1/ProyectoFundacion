-- ============================================================================
-- SCRIPT: Limpiar Documentos Duplicados
-- Elimina documentos duplicados, dejando solo el más reciente por plantilla/usuario
-- ============================================================================

-- Eliminar documentos duplicados, dejando solo el más reciente
-- para cada combinación de plantilla_id + creado_por
DELETE FROM documentos_instancia
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY plantilla_id, creado_por 
        ORDER BY creado_en DESC
      ) as rn
    FROM documentos_instancia
  ) sub
  WHERE rn > 1  -- Mantener solo el primero (más reciente), eliminar los demás
);

-- Verificar resultado
SELECT 
  plantilla_id,
  creado_por,
  COUNT(*) as total_documentos
FROM documentos_instancia
GROUP BY plantilla_id, creado_por
HAVING COUNT(*) > 1;

-- Si la consulta anterior no retorna filas, significa que no hay duplicados

