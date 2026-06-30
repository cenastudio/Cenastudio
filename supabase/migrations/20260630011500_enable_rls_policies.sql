-- Security hardening for FRAME/Cena Studio Supabase tables.
-- The server may still use the service role key, which bypasses RLS.
-- Browser/client access is limited to public catalog data and each user's own rows.

alter table public.users enable row level security;
alter table public.generations enable row level security;
alter table public.contacts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage enable row level security;
alter table public.reset_tokens enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_states enable row level security;
alter table public.opportunities enable row level security;
alter table public.interactions enable row level security;
alter table public.collaborators enable row level security;
alter table public.project_members enable row level security;
alter table public.files enable row level security;
alter table public.video_reviews enable row level security;
alter table public.video_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.financial_entries enable row level security;
alter table public.studio_settings enable row level security;

alter table public.tools enable row level security;
alter table public.plans enable row level security;

drop policy if exists "Public can read active tools" on public.tools;
create policy "Public can read active tools"
on public.tools for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read plans" on public.plans;
create policy "Public can read plans"
on public.plans for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can submit contact forms" on public.contacts;
create policy "Anyone can submit contact forms"
on public.contacts for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can read own profile row" on public.users;
create policy "Users can read own profile row"
on public.users for select
to authenticated
using (supabase_id = auth.uid());

drop policy if exists "Users can update own profile row" on public.users;
create policy "Users can update own profile row"
on public.users for update
to authenticated
using (supabase_id = auth.uid())
with check (supabase_id = auth.uid());

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
on public.subscriptions for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = subscriptions.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can read own usage" on public.usage;
create policy "Users can read own usage"
on public.usage for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = usage.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own clients" on public.clients;
create policy "Users can manage own clients"
on public.clients for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = clients.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = clients.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects"
on public.projects for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = projects.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = projects.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own project states" on public.project_states;
create policy "Users can manage own project states"
on public.project_states for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_states.project_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_states.project_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own generations" on public.generations;
create policy "Users can manage own generations"
on public.generations for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = generations.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = generations.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own opportunities" on public.opportunities;
create policy "Users can manage own opportunities"
on public.opportunities for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = opportunities.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = opportunities.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own interactions" on public.interactions;
create policy "Users can manage own interactions"
on public.interactions for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = interactions.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = interactions.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own collaborators" on public.collaborators;
create policy "Users can manage own collaborators"
on public.collaborators for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = collaborators.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = collaborators.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own project members" on public.project_members;
create policy "Users can manage own project members"
on public.project_members for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_members.project_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.users u on u.id = p.user_id
    where p.id = project_members.project_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own files" on public.files;
create policy "Users can manage own files"
on public.files for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = files.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = files.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own reviews" on public.video_reviews;
create policy "Users can manage own reviews"
on public.video_reviews for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = video_reviews.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = video_reviews.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage comments on own reviews" on public.video_comments;
create policy "Users can manage comments on own reviews"
on public.video_comments for all
to authenticated
using (
  exists (
    select 1
    from public.video_reviews vr
    join public.users u on u.id = vr.user_id
    where vr.id = video_comments.review_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.video_reviews vr
    join public.users u on u.id = vr.user_id
    where vr.id = video_comments.review_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own notifications" on public.notifications;
create policy "Users can manage own notifications"
on public.notifications for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = notifications.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = notifications.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own financial entries" on public.financial_entries;
create policy "Users can manage own financial entries"
on public.financial_entries for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = financial_entries.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = financial_entries.user_id
      and u.supabase_id = auth.uid()
  )
);

drop policy if exists "Users can manage own studio settings" on public.studio_settings;
create policy "Users can manage own studio settings"
on public.studio_settings for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = studio_settings.user_id
      and u.supabase_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = studio_settings.user_id
      and u.supabase_id = auth.uid()
  )
);

-- No client-side policy for reset_tokens. They are server-only.
