-- Phase 3: notifications + distribution lists

alter table public.members
  add column if not exists notification_prefs jsonb not null default '{
    "digest": true,
    "deadlines": true,
    "vfx_updates": false,
    "cut_versions": true
  }'::jsonb;

alter table public.shows
  add column if not exists distribution_lists jsonb not null default '{
    "dailies": [],
    "cuts": [],
    "deadlines": []
  }'::jsonb;

create policy members_update_self on public.members
  for update
  using (
    user_id = auth.uid()
    and org_id in (select public.user_org_ids())
  )
  with check (
    user_id = auth.uid()
    and org_id in (select public.user_org_ids())
  );
