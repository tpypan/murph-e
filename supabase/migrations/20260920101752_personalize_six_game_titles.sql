-- Premise-based display names; keep stable IDs, creators and original source files.
do $$
declare changed integer;
begin
  update public.game_creator_attributions as game
  set title = requested.new_title
  from (values
    ('catalog', 'kart', 'COAST CIRCUIT', 'SUNSET SLIPSTREAM', 'Kaibo Huang'),
    ('catalog', 'fighter', 'MIDNIGHT DUEL', 'ROOFTOP RIVALS', 'Arjun Virk'),
    ('catalog', 'speed-platformer', 'AZURE DASH', 'LOOP RUSH', 'Rohanth Marem'),
    ('catalog', 'bomber', 'BLAST PATROL', 'FUSE FRENZY', 'Chinmay Jindal'),
    ('catalog', 'crossing', 'RIVER RUN', 'TRAFFIC & TIDES', 'Srinikesh Singarapu'),
    ('library', 'casper-climb', 'CASPER CLIMB', 'HAUNTED HIGHRISE', 'Casper Dong')
  ) as requested(game_kind, game_id, old_title, new_title, creator_name)
  where game.game_kind = requested.game_kind
    and game.game_id = requested.game_id
    and game.title = requested.old_title
    and game.creator_name = requested.creator_name;
  get diagnostics changed = row_count;
  if changed <> 6 then
    raise exception 'Expected 6 game title changes, updated %', changed;
  end if;
end $$;
