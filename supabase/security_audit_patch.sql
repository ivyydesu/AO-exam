-- Deprecated: security audit schema has been merged into supabase/schema.sql.
-- Run supabase/schema.sql instead.

do $$
begin
  raise notice 'security_audit_patch.sql is deprecated. Run supabase/schema.sql.';
end $$;
