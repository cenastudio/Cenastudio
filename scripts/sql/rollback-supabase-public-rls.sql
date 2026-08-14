-- Emergency rollback for supabase/migrations/20260814142142_harden_public_rls.sql.
-- Use only if the production app shows an unexpected dependency on direct
-- browser/Data API table access.

do $$
declare
  table_name text;
begin
  for table_name in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I disable row level security', table_name);
    execute format('alter table public.%I no force row level security', table_name);
  end loop;
end $$;

drop policy if exists "public_read_tools" on public.tools;
drop policy if exists "public_read_plans" on public.plans;

grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
