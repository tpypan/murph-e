-- Immutable reviewed versions. Executable source is still hash-verified locally.
create table public.reusable_components (
  component_id text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  version text not null,
  kind text not null check (kind in ('foundation', 'mechanic', 'asset')),
  title text not null,
  description text not null,
  search_text text not null,
  search_vector tsvector generated always as (to_tsvector('english', search_text)) stored,
  supported_players smallint[] not null check (supported_players <@ array[1,2]::smallint[] and cardinality(supported_players) > 0),
  runtime_api_version integer not null,
  capabilities jsonb not null,
  manifest jsonb not null,
  contract text not null,
  module_source text not null,
  evidence jsonb not null,
  status text not null check (status in ('draft', 'verified', 'retired')),
  created_at timestamptz not null default now(),
  primary key (component_id, content_hash)
);
create index reusable_components_search_idx on public.reusable_components using gin(search_vector);
create index reusable_components_eligibility_idx on public.reusable_components(kind, status, runtime_api_version);
alter table public.reusable_components enable row level security;
revoke all on public.reusable_components from public, anon, authenticated;
grant select, insert on public.reusable_components to service_role;

-- Rank the small eligible catalog without dropping zero-keyword candidates.
-- Jev can recover semantic matches; the application rechecks installed hashes.
create function public.search_reusable_foundations(request_text text, result_limit integer default 24)
returns table(component_id text, content_hash text, rank real)
language sql stable security invoker set search_path = '' as $$
  select c.component_id, c.content_hash,
    ts_rank(c.search_vector, websearch_to_tsquery('english', left(request_text, 4000))) as rank
  from public.reusable_components c
  where c.kind = 'foundation' and c.status = 'verified' and c.runtime_api_version = 1
    and c.supported_players @> array[1,2]::smallint[]
  order by rank desc, c.component_id, c.created_at desc
  limit greatest(1, least(coalesce(result_limit,24), 64));
$$;
revoke all on function public.search_reusable_foundations(text, integer) from public, anon, authenticated;
grant execute on function public.search_reusable_foundations(text, integer) to service_role;

-- Historical player-count metadata is not proof that both modes passed.
alter table public.generated_games
  add column supported_players smallint[],
  add column reuse_json jsonb not null default '{}'::jsonb;
alter table public.generated_games add constraint generated_games_supported_players_check
  check (supported_players is null or (supported_players <@ array[1,2]::smallint[] and cardinality(supported_players) > 0));
comment on column public.generated_games.players is 'Initial session mode, not supported mode coverage.';
comment on column public.generated_games.supported_players is 'Modes validated on this exact delivered source. Null for historical unverified coverage.';
comment on column public.generated_games.reuse_json is 'Retrieval, router outcome, static factory calls, source sizes, timing and dual-mode probe evidence. Selection alone does not establish reuse.';
