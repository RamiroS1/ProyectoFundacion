-- Asignar rol TESTER a ramiroavila999@gmail.com
-- Ejecutar después de schema.sql y rls_policies.sql

UPDATE user_profiles
SET rol_profesional = 'TESTER'::rol_profesional
WHERE email = 'ramiroavila999@gmail.com';