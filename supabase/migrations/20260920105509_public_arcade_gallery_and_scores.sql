-- Public projection only. Game code, transcripts and badge identities remain private.
create table public.arcade_games (
  slug text primary key,
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  genre text not null default 'arcade',
  creator_name text not null default 'GUEST',
  supported_players smallint[] not null default '{1}',
  thumbnail_url text,
  source text not null check (source in ('generated', 'catalog', 'library', 'template')),
  created_at timestamptz not null default now()
);
create index arcade_games_created_idx on public.arcade_games (created_at desc, slug);
create table public.arcade_players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  is_guest boolean not null default false,
  last_played_at timestamptz not null default now()
);
create table public.arcade_player_identities (
  badge_id text primary key,
  player_id uuid not null unique default gen_random_uuid()
    references public.arcade_players(id) deferrable initially deferred
);
create table public.arcade_scores (
  id text primary key,
  session_id uuid not null,
  game_slug text not null references public.arcade_games(slug),
  player_id uuid not null references public.arcade_players(id),
  player_slot smallint not null check (player_slot in (0,1)),
  players smallint not null check (players in (1,2)),
  score bigint not null check (score between 0 and 2147483647),
  outcome text not null check (outcome in ('win','loss','completed')),
  played_at timestamptz not null,
  unique (session_id, player_slot),
  check (player_slot < players)
);
create index arcade_scores_best_idx on public.arcade_scores (player_id, game_slug, players, score desc, played_at, id);
create index arcade_scores_game_idx on public.arcade_scores (game_slug, players, score desc);
create index arcade_scores_recent_idx on public.arcade_scores (played_at desc);

alter table public.arcade_games enable row level security;
alter table public.arcade_players enable row level security;
alter table public.arcade_player_identities enable row level security;
alter table public.arcade_scores enable row level security;
revoke all on public.arcade_games, public.arcade_players, public.arcade_player_identities, public.arcade_scores from public, anon, authenticated;
grant select on public.arcade_games, public.arcade_players, public.arcade_scores to anon, authenticated;
grant select, insert, update, delete on public.arcade_games, public.arcade_players, public.arcade_player_identities, public.arcade_scores to service_role;
create policy "Public gallery" on public.arcade_games for select to anon, authenticated using (true);
create policy "Public player names" on public.arcade_players for select to anon, authenticated using (true);
create policy "Public scores" on public.arcade_scores for select to anon, authenticated using (true);

-- Each badge/game/mode has one personal best. Anonymous runs have separate identities.
create view public.arcade_leaderboard with (security_invoker = true) as
select s.id, s.player_id, p.name as player_name, p.is_guest, s.game_slug, g.title as game_title,
  g.thumbnail_url, s.players, s.score, s.outcome, s.played_at
from (
  select distinct on (player_id, game_slug, players) * from public.arcade_scores
  order by player_id, game_slug, players, score desc, played_at, id
) s join public.arcade_players p on p.id = s.player_id
join public.arcade_games g on g.slug = s.game_slug;
create view public.arcade_stats with (security_invoker = true) as
select (select count(*) from public.arcade_games) as games,
       (select count(*) from public.arcade_players) as players,
       (select count(*) from public.arcade_scores) as scores;
grant select on public.arcade_leaderboard, public.arcade_stats to anon, authenticated, service_role;

-- Cabinet-only transaction: identity mapping and score insert succeed together.
-- An event retry is harmless, but it cannot replace a completed score.
create function public.record_arcade_score(
  p_id text, p_session uuid, p_game text, p_slot smallint, p_mode smallint,
  p_badge text, p_name text, p_score bigint, p_outcome text, p_played_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
declare who uuid; old public.arcade_scores%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id, 0));
  select * into old from public.arcade_scores where id = p_id;
  if found then
    if old.session_id <> p_session or old.game_slug <> p_game or old.player_slot <> p_slot
      or old.players <> p_mode or old.score <> p_score or old.outcome <> p_outcome then
      raise exception 'Score event conflicts with a completed result';
    end if;
    return;
  end if;
  if nullif(trim(p_badge), '') is not null then
    insert into public.arcade_player_identities (badge_id) values (p_badge)
      on conflict (badge_id) do update set badge_id = excluded.badge_id returning player_id into who;
  else
    who := gen_random_uuid();
  end if;
  insert into public.arcade_players (id, name, is_guest, last_played_at)
    values (who, case when p_badge is null then 'GUEST' else coalesce(nullif(trim(p_name),''),'GUEST') end, p_badge is null, p_played_at)
    on conflict (id) do update set name = excluded.name,
      last_played_at = greatest(public.arcade_players.last_played_at, excluded.last_played_at);
  insert into public.arcade_scores (id, session_id, game_slug, player_id, player_slot, players, score, outcome, played_at)
    values (p_id, p_session, p_game, who, p_slot, p_mode, p_score, p_outcome, p_played_at);
end $$;
revoke all on function public.record_arcade_score(text,uuid,text,smallint,smallint,text,text,bigint,text,timestamptz) from public, anon, authenticated;
grant execute on function public.record_arcade_score(text,uuid,text,smallint,smallint,text,text,bigint,text,timestamptz) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arcade-thumbnails','arcade-thumbnails',true,2097152,array['image/png','image/webp','image/jpeg'])
on conflict (id) do nothing;
