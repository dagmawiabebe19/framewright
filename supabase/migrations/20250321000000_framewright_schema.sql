-- FRAMEWRIGHT core schema + RLS + Realtime
-- Run in Supabase SQL Editor or via supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.shows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  show_code text not null,
  project_type text not null check (project_type in ('feature', 'episodic')),
  season_number int not null default 1,
  total_episodes int,
  frame_rate text not null default '23.976',
  created_at timestamptz not null default now(),
  unique (org_id, show_code)
);

create index shows_org_id_idx on public.shows (org_id);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  episode_number text not null,
  title text not null,
  status text not null default 'prep'
    check (status in ('prep', 'shooting', 'editorial', 'locked', 'delivered')),
  picture_lock_date date,
  delivery_date date,
  created_at timestamptz not null default now(),
  unique (show_id, episode_number)
);

create index episodes_show_id_idx on public.episodes (show_id);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (
    role in (
      'editor',
      'ae',
      'post_coordinator',
      'post_supervisor',
      'director',
      'producer',
      'vfx_supervisor',
      'colorist',
      'sound_mixer',
      'music_supervisor'
    )
  ),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index members_user_id_idx on public.members (user_id);
create index members_org_id_idx on public.members (org_id);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  type text not null check (
    type in (
      'vfx_sheet',
      'sound_turnover',
      'color_turnover',
      'music_cue_sheet',
      'adr_list',
      'change_list',
      'pull_list',
      'delivery_manifest',
      'cut_log'
    )
  ),
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'received', 'approved', 'rejected')),
  file_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index deliverables_episode_id_idx on public.deliverables (episode_id);

create table public.vfx_shots (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  shot_id text,
  standard_id text,
  scene text,
  reel text,
  tc_in text,
  tc_out text,
  src_tc_in text,
  src_tc_out text,
  frames int,
  handles int not null default 8,
  description text,
  priority text,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'in_progress',
        'delivered',
        'approved',
        'needs_revision'
      )
    ),
  thumbnail_url text,
  vendor text,
  notes text,
  created_at timestamptz not null default now()
);

create index vfx_shots_deliverable_id_idx on public.vfx_shots (deliverable_id);

create table public.cut_versions (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  version_name text not null,
  cut_type text not null check (
    cut_type in (
      'assembly',
      'editors_cut',
      'directors_cut',
      'producers_cut',
      'network_cut',
      'picture_lock'
    )
  ),
  duration_tc text,
  file_url text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index cut_versions_episode_id_idx on public.cut_versions (episode_id);

create table public.cut_notes (
  id uuid primary key default gen_random_uuid(),
  cut_version_id uuid not null references public.cut_versions (id) on delete cascade,
  tc text,
  department text,
  note text not null,
  status text not null default 'open'
    check (status in ('open', 'implemented', 'deferred', 'rejected')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index cut_notes_cut_version_id_idx on public.cut_notes (cut_version_id);

create table public.dailies_rolls (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  roll_name text not null,
  camera text,
  shoot_date date,
  card_count int,
  status text not null default 'expected'
    check (
      status in (
        'expected',
        'received',
        'ingested',
        'synced',
        'uploaded',
        'confirmed'
      )
    ),
  notes text,
  created_at timestamptz not null default now()
);

create index dailies_rolls_episode_id_idx on public.dailies_rolls (episode_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  show_id uuid references public.shows (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_org_id_idx on public.activity_log (org_id);
create index activity_log_created_at_idx on public.activity_log (created_at desc);

-- Pending team invitations (magic link via Resend)
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (
    role in (
      'editor',
      'ae',
      'post_coordinator',
      'post_supervisor',
      'director',
      'producer',
      'vfx_supervisor',
      'colorist',
      'sound_mixer',
      'music_supervisor'
    )
  ),
  token text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index invitations_org_id_idx on public.invitations (org_id);
create index invitations_token_idx on public.invitations (token);

-- ---------------------------------------------------------------------------
-- Helper: org access via membership
-- ---------------------------------------------------------------------------

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.members where user_id = auth.uid();
$$;

grant execute on function public.user_org_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: atomic org + owner membership
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_with_membership(
  org_name text,
  org_slug text,
  member_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.members (org_id, user_id, role)
  values (new_org_id, auth.uid(), member_role);

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_with_membership(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.shows enable row level security;
alter table public.episodes enable row level security;
alter table public.members enable row level security;
alter table public.deliverables enable row level security;
alter table public.vfx_shots enable row level security;
alter table public.cut_versions enable row level security;
alter table public.cut_notes enable row level security;
alter table public.dailies_rolls enable row level security;
alter table public.activity_log enable row level security;
alter table public.invitations enable row level security;

-- Organizations
create policy orgs_select on public.organizations
  for select using (id in (select public.user_org_ids()));

create policy orgs_update on public.organizations
  for update using (id in (select public.user_org_ids()));

-- Members
create policy members_select on public.members
  for select using (org_id in (select public.user_org_ids()));

create policy members_insert_self on public.members
  for insert with check (
    user_id = auth.uid()
    and org_id in (select public.user_org_ids())
  );

-- Allow org members to add teammates (invites / admin) — target user_id may differ
create policy members_insert_by_org on public.members
  for insert with check (
    org_id in (select public.user_org_ids())
  );

-- Invitations: org members can manage
create policy invitations_select on public.invitations
  for select using (org_id in (select public.user_org_ids()));

create policy invitations_insert on public.invitations
  for insert with check (org_id in (select public.user_org_ids()));

create policy invitations_update on public.invitations
  for update using (org_id in (select public.user_org_ids()));

-- Shows
create policy shows_all on public.shows
  for all using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- Episodes (via show)
create policy episodes_all on public.episodes
  for all using (
    show_id in (
      select s.id from public.shows s
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    show_id in (
      select s.id from public.shows s
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Deliverables
create policy deliverables_all on public.deliverables
  for all using (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- VFX shots
create policy vfx_shots_all on public.vfx_shots
  for all using (
    deliverable_id in (
      select d.id from public.deliverables d
      join public.episodes e on e.id = d.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    deliverable_id in (
      select d.id from public.deliverables d
      join public.episodes e on e.id = d.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Cut versions
create policy cut_versions_all on public.cut_versions
  for all using (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Cut notes
create policy cut_notes_all on public.cut_notes
  for all using (
    cut_version_id in (
      select cv.id from public.cut_versions cv
      join public.episodes e on e.id = cv.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    cut_version_id in (
      select cv.id from public.cut_versions cv
      join public.episodes e on e.id = cv.episode_id
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Dailies rolls
create policy dailies_rolls_all on public.dailies_rolls
  for all using (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  )
  with check (
    episode_id in (
      select e.id from public.episodes e
      join public.shows s on s.id = e.show_id
      where s.org_id in (select public.user_org_ids())
    )
  );

-- Activity log
create policy activity_log_select on public.activity_log
  for select using (org_id in (select public.user_org_ids()));

create policy activity_log_insert on public.activity_log
  for insert with check (org_id in (select public.user_org_ids()));

-- ---------------------------------------------------------------------------
-- REALTIME
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.vfx_shots;
alter publication supabase_realtime add table public.cut_versions;
alter publication supabase_realtime add table public.cut_notes;
alter publication supabase_realtime add table public.dailies_rolls;
alter publication supabase_realtime add table public.deliverables;
