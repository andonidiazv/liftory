-- Herramienta de diagnóstico: leer las políticas RLS reales desde la app.
--
-- Hace falta porque los archivos de migración no son fuente de verdad: una
-- política cambiada desde el dashboard de Supabase no deja rastro aquí. Antes
-- de tocar la seguridad hay que ver lo que de verdad está aplicado.
--
-- Sólo el service_role puede ejecutarla. Ni anon ni authenticated.
CREATE OR REPLACE FUNCTION public.rls_report()
RETURNS TABLE (tabla TEXT, rls_activo BOOLEAN, politica TEXT, comando TEXT, roles TEXT, expresion TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT c.relname::text,
         c.relrowsecurity,
         p.polname::text,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                       WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
         COALESCE((SELECT string_agg(r.rolname::text, ',') FROM pg_roles r WHERE r.oid = ANY(p.polroles)), 'PUBLIC'),
         pg_get_expr(p.polqual, p.polrelid)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
   WHERE n.nspname = 'public' AND c.relkind = 'r'
   ORDER BY c.relname, p.polname;
$$;

REVOKE ALL ON FUNCTION public.rls_report() FROM PUBLIC, anon, authenticated;
