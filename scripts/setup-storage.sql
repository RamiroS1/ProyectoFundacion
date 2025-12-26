-- ============================================================================
-- SCRIPT: Configuración de Supabase Storage para Plantillas
-- Ejecuta este script en Supabase SQL Editor para configurar el bucket
-- ============================================================================

-- NOTA: Los buckets de Storage se crean desde el Dashboard o desde el script
-- upload-plantillas.js. Este script solo configura las políticas RLS.

-- ============================================================================
-- POLÍTICAS DE STORAGE (si decides usar RLS en Storage)
-- ============================================================================

-- Permitir lectura pública de plantillas (opcional)
-- Si quieres que las plantillas sean accesibles sin autenticación:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('plantillas', 'plantillas', true)
-- ON CONFLICT (id) DO NOTHING;

-- O si prefieres que solo usuarios autenticados puedan leer:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('plantillas', 'plantillas', false)
-- ON CONFLICT (id) DO NOTHING;

-- Políticas de lectura (si el bucket es privado)
-- CREATE POLICY "Usuarios autenticados pueden leer plantillas"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'plantillas' AND
--   auth.role() = 'authenticated'
-- );

-- Políticas de escritura (solo admin)
-- CREATE POLICY "Solo admin puede subir plantillas"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'plantillas' AND
--   EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE id = auth.uid() AND rol_profesional = 'ADMIN'
--   )
-- );

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- El bucket se crea automáticamente cuando ejecutas upload-plantillas.js
-- Si prefieres crearlo manualmente:
-- 1. Ve a Supabase Dashboard > Storage
-- 2. Crea un nuevo bucket llamado "plantillas"
-- 3. Configura si será público o privado
-- 4. Ajusta las políticas según tus necesidades de seguridad

