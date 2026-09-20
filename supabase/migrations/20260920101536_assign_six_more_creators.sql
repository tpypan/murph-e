-- Reassign exactly one existing game to each newly requested creator.
-- Preserve badge identities, original source credits and all other assignments.
do $$
declare changed integer;
begin
  update public.game_creator_attributions as current
  set creator_name = requested.creator_name, assigned_at = now()
  from (values
    ('catalog', 'kart', 'Kaibo Huang'),
    ('catalog', 'bomber', 'Chinmay Jindal'),
    ('catalog', 'fighter', 'Arjun Virk'),
    ('catalog', 'speed-platformer', 'Rohanth Marem'),
    ('library', 'casper-climb', 'Casper Dong'),
    ('catalog', 'crossing', 'Srinikesh Singarapu')
  ) as requested(game_kind, game_id, creator_name)
  where current.game_kind = requested.game_kind
    and current.game_id = requested.game_id
    and current.creator_name in ('Zane Beeai', 'Shayaan Azeem', 'Sahiti Dasari', 'Tony Pan');
  get diagnostics changed = row_count;
  if changed <> 6 then
    raise exception 'Expected 6 creator assignments, updated %', changed;
  end if;
end $$;
