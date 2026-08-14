-- Harden Supabase Data API exposure for Cena Studio.
--
-- The app server uses Prisma through the Postgres connection and Supabase
-- service-role APIs for administrative operations. Browser access should only
-- see public catalog data through the Supabase REST API.

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
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I no force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

revoke all on all sequences in schema public from anon, authenticated;

drop policy if exists "Public can read active tools" on public.tools;
drop policy if exists "public_read_tools" on public.tools;
create policy "public_read_tools"
on public.tools
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read plans" on public.plans;
drop policy if exists "public_read_plans" on public.plans;
create policy "public_read_plans"
on public.plans
for select
to anon, authenticated
using (true);

grant select on table public.tools to anon, authenticated;
grant select on table public.plans to anon, authenticated;
