-- Idempotent: safe if 20250323000000_phase3.sql already ran
alter table public.shows
  add column if not exists distribution_lists jsonb not null default '{
    "dailies": [],
    "cuts": [],
    "deadlines": []
  }'::jsonb;
