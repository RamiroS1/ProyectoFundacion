-- Eliminar plantilla F15.GO6.PP y todo lo relacionado
DELETE FROM valores_campo WHERE documento_instancia_id IN (
  SELECT id FROM documentos_instancia WHERE plantilla_id IN (
    SELECT id FROM plantillas_documento WHERE codigo = 'F15.GO6.PP'
  )
);
DELETE FROM documentos_instancia WHERE plantilla_id IN (
  SELECT id FROM plantillas_documento WHERE codigo = 'F15.GO6.PP'
);
DELETE FROM campos_plantilla WHERE plantilla_id IN (
  SELECT id FROM plantillas_documento WHERE codigo = 'F15.GO6.PP'
);
DELETE FROM plantillas_documento WHERE codigo = 'F15.GO6.PP';

