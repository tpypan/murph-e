-- Delivered arcade games. Candidate attempts remain in the local audit database.
-- A run has its own creator even when its code matches another generated game.
create table public.generated_games (
  run_id text primary key,
  slug text not null unique,
  title text not null,
  genre text not null,
  players smallint not null check (players in (1, 2)),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  code text not null,
  source_code text not null,
  spec_json jsonb not null check (jsonb_typeof(spec_json) = 'object'),
  transcript text not null,
  creator_badge_id text,
  creator_name text not null default 'GUEST',
  parts_json jsonb not null default '[]'::jsonb check (jsonb_typeof(parts_json) = 'array'),
  sprites_json jsonb not null default '[]'::jsonb check (jsonb_typeof(sprites_json) = 'array'),
  thumbnail bytea,
  source text not null check (source in ('build', 'repair')),
  model text not null,
  effort text not null,
  created_at timestamptz not null default now()
);

create index generated_games_creator_created_at_idx
  on public.generated_games (creator_badge_id, created_at desc);

comment on column public.generated_games.code is
  'Complete playable JavaScript including linked sprite pixels and animations.';
comment on column public.generated_games.sprites_json is
  'Selected sprite identifiers, hashes, original sources, provenance and licenses.';
comment on column public.generated_games.creator_badge_id is
  'P1 identity from the cabinet server at generation start; null for guests. Not a Supabase Auth user ID.';

-- Badge IDs are attribution, not authentication. Only the cabinet server may
-- write these records. Public clients cannot claim someone else's badge identity
-- or read transcripts through the publishable key.
alter table public.generated_games enable row level security;
revoke all on public.generated_games from public, anon, authenticated;
grant select, insert on public.generated_games to service_role;
