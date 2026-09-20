begin;
set local role service_role;
insert into public.arcade_games (slug,title,source) values ('__offline_arcade_verify__','Offline verification','catalog');
select public.record_arcade_score('__verify_1', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','__offline_arcade_verify__',0::smallint,2::smallint,'__offline_badge_1','Offline One',100,'win',now());
select public.record_arcade_score('__verify_1', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','__offline_arcade_verify__',0::smallint,2::smallint,'__offline_badge_1','Offline One',100,'win',now());
select public.record_arcade_score('__verify_2', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','__offline_arcade_verify__',1::smallint,2::smallint,'__offline_badge_2','Offline Two',50,'loss',now());
select public.record_arcade_score('__verify_3', 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb','__offline_arcade_verify__',0::smallint,2::smallint,'__offline_badge_1','Offline One',80,'completed',now());
select public.record_arcade_score('__verify_4', 'cccccccc-1111-4111-8111-cccccccccccc','__offline_arcade_verify__',0::smallint,1::smallint,null,'Ignored',25,'completed',now());
do $$ begin
 if (select count(*) from public.arcade_scores where game_slug='__offline_arcade_verify__') <> 4 then raise exception 'Score retries duplicated'; end if;
 if (select count(*) from public.arcade_leaderboard where game_slug='__offline_arcade_verify__') <> 3 then raise exception 'Personal-best deduplication failed'; end if;
 if (select score from public.arcade_leaderboard where game_slug='__offline_arcade_verify__' and player_name='Offline One') <> 100 then raise exception 'Best score incorrect'; end if;
 begin
  perform public.record_arcade_score('__verify_1', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','__offline_arcade_verify__',0::smallint,2::smallint,'__offline_badge_1','Offline One',999,'win',now());
  raise exception 'Conflicting score incorrectly accepted' using errcode='23514';
 exception when raise_exception then null;
 end;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.arcade_leaderboard where game_slug='__offline_arcade_verify__') <> 3 then raise exception 'Public leaderboard not readable'; end if;
 begin
  perform badge_id from public.arcade_player_identities limit 1;
  raise exception 'Private identities exposed';
 exception when insufficient_privilege then null; end;
 begin
  perform code from public.generated_games limit 1;
  raise exception 'Private source exposed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.arcade_games(slug,title,source) values ('__anonymous_write__','Blocked','catalog');
  raise exception 'Anonymous game write allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.record_arcade_score('__anon_score','dddddddd-1111-4111-8111-dddddddddddd','__offline_arcade_verify__',0::smallint,1::smallint,null,'GUEST',9,'win',now());
  raise exception 'Anonymous score write allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
