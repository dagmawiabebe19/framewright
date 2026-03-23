-- Phase 2: storage, show settings, shot notes, dailies shoot_day, realtime extras

-- Show-level JSON settings (distribution lists, vendor list, etc.)
alter table public.shows
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Dailies: optional production shoot day number (e.g. 22)
alter table public.dailies_rolls
  add column if not exists shoot_day int;

update public.dailies_rolls
set shoot_day = 1
where shoot_day is null;

create index if not exists dailies_rolls_episode_shoot_day_idx
  on public.dailies_rolls (episode_id, shoot_day);

-- Threaded notes for VFX shots (separate from single-line vendor notes on vfx_shots.notes)
create table if not exists public.vfx_shot_notes (
  id uuid primary key default gen_random_uuid(),
  vfx_shot_id uuid not null references public.vfx_shots (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists vfx_shot_notes_shot_idx on public.vfx_shot_notes (vfx_shot_id);

alter table public.vfx_shot_notes enable row level security;

create policy vfx_shot_notes_all on public.vfx_shot_notes
  for all using (
    vfx_shot_id in (
      select vs.id from public.vfx_shots vs
      join public.deliverables d on d.id = vs.deliverable_id
      join public.episodes e on e.id = d.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    vfx_shot_id in (
      select vs.id from public.vfx_shots vs
      join public.deliverables d on d.id = vs.deliverable_id
      join public.episodes e on e.id = d.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Storage bucket for deliverables + thumbnails (private)
insert into storage.buckets (id, name, public, file_size_limit)
values ('deliverables', 'deliverables', false, 524288000)
on conflict (id) do update set public = excluded.public;

-- Storage policies: first path segment must match an org the user belongs to
create policy deliverables_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deliverables'
    and (storage.foldername (name))[1] in (
      select m.org_id::text from public.members m where m.user_id = auth.uid()
    )
  );

create policy deliverables_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and (storage.foldername (name))[1] in (
      select m.org_id::text from public.members m where m.user_id = auth.uid()
    )
  );

create policy deliverables_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'deliverables'
    and (storage.foldername (name))[1] in (
      select m.org_id::text from public.members m where m.user_id = auth.uid()
    )
  );

create policy deliverables_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deliverables'
    and (storage.foldername (name))[1] in (
      select m.org_id::text from public.members m where m.user_id = auth.uid()
    )
  );

-- Realtime: activity feed + episode status strip
alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.episodes;
