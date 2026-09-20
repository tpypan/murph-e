# Arcade sound effects

Gameplay sound is on by default. Options can mute it. Home previews, Ready,
voice/build screens and paused games remain silent. Death/victory effects may
finish on the results screen without advancing the game. The kiosk launcher enables
Web Audio for badge-only starts; an ordinary browser starts audio after a click
or keyboard gesture.

The shared bank has eight original procedural effects: jump, hit, coin, explode,
select, die, powerup and shoot. `packages/runtime/src/sound-bank.ts` is the
authoritative asset source; both the runtime synth and SQLite index use those
same note recipes. Each recipe records wave shape, frequency/sweep, duration,
delay and relative volume. Games can add short `api.tone` phrases. No sound files
need downloading and generation adds no model call.

Playback imports the compiled bank; SQLite indexes recipes and observations but
does not load new cues into the runtime. Games choose event triggers. New named
cues require bank/API/prompt updates; custom tone phrases need no new bank entry.
See [the current database and audio audit](catalog-and-audio-audit.md) for inventory,
per-effect use, generation integration and verification limits.

`data/catalog.sqlite` stores:

- `sound_effects`: effect ID, exact recipe, content hash, event hint and provenance.
- `game_audio_checks`: actual observed cue counts and tones by game, player count
  and exact code hash, plus runtime/bank hashes and the exercise evidence.

Run `pnpm sounds:check /tmp/arcade-audio.json` to exercise local catalog demos,
saved games and fallback templates and update SQLite. It runs actual runtime updates with deterministic
inputs and seeds, intercepting gameplay audio calls after START. It fails on
silent gameplay, invalid cues or runtime errors. Draft catalog packs are reported
as excluded, never marked tested. Evidence establishes reachable gameplay sound;
it does not claim exhaustive branch coverage or physical speaker output.

`pnpm harness catalog index` also refreshes the sound bank. Sound checks do not
promote catalog or generated games to verified status. Changed code needs a new
audio check; an old record applies only to its stored code hash.

For browser playback, run
`pnpm --filter @htn/probe exec node scripts/audio-ui-test.mjs` against the local
cabinet. It verifies a running AudioContext and nonzero waveform during a real
game, silence on pause/mute, and no model or speech requests. Screenshots and
measurements are saved under `bench/audits/audio-ui/`.
