# Local library and audio audit — 2026-09-19

Read-only inspection of `data/catalog.sqlite` after refreshing the catalog and
running the current games through the offline sound audit. SQLite `quick_check`
returns `ok`. The snapshot is 2,756,608 bytes (2.63 MiB), across 11 tables.

## What is stored

| Table | Rows | Meaning |
| --- | ---: | --- |
| `catalog_parts` | 19 | Verified game packs across 13 mechanics families; all support 1P and 2P. |
| `sprite_sets` | 67 | 40 verified sets; 27 source-checked sets, including partial pose collections and props. Not 67 complete characters. |
| `reference_games` | 19 | Source game pages, family associations and provenance. |
| `reference_sheets` | 92 | 13 downloaded sheets; 79 discovered references. A URL is not an imported, runtime-ready asset. |
| `generated_candidates` | 63 | Historical unique code versions, all quarantined; not admitted base games. |
| `candidate_runs` | 64 | Historical run-to-code associations. |
| `candidate_attempts` | 0 | New per-attempt recording schema; existing imported history was not fabricated/backfilled. |
| `candidate_validation_events` | 0 | New per-attempt validation history; no entries yet. |
| `candidate_reviews` | 4 | Recorded needs-work reviews tied to candidate/evidence hashes. |
| `sound_effects` | 8 | Exact procedural recipes, event hints, content hashes and provenance. |
| `game_audio_checks` | 123 | Hash-bound audio observations, including older game revisions. The fresh audit covers 103 current game/player combinations. |

The 13 families are inertial space shooting, bomb arenas, brick breaking,
barrel/ladder climbing, road/river crossing, falling blocks, fighting, formation
shooting, circuit racing, maze chase, missile defense, paddle duels and momentum
platforming. Six private source-art adaptations add Sonic, Batman Atari,
Spider-Man, Donkey Kong, Pac-Man and Pole Position. These use authored controllers
and rules; they are not recovered original commercial game programs.

Source files remain authoritative: game factories/contracts, sprite animation
data and evidence live in `library/catalog/` and private `data/local-catalog/`.
The index records their hashes, manifests, provenance and status. The current
generation context loaders select those checked files and bundle selected
factories/assets into the final game. SQLite also retains candidate and review
history; it is not model training, and quarantined outputs are not automatically
promoted or reused.

All 19 entries were verified in the real home menu. It now refreshes metadata
every five seconds while visible and when focus returns, preserves the selected
game/mode, and invalidates cached code when its content revision changes. Failed
refreshes retain the existing menu. Real games still wait at Ready for START.

## Sound effects and actual use

The canonical bank is `packages/runtime/src/sound-bank.ts`. These are original
Web Audio oscillator/noise recipes, not downloaded samples or original game
recordings. The runtime synthesizes them locally; no audio download or model
request is needed.

| Cue | Sound | Existing uses |
| --- | --- | --- |
| `jump` | Short rising square-wave sweep | Sonic/platform jumps, fighter jumps, climber jumps, crossing hops. |
| `hit` | Falling saw wave plus brief noise | Fighter impacts, racing collisions, paddle/brick contact, platformer damage. |
| `coin` | Two rising square-wave notes | Sonic rings, maze pellets, paddle points and other rewards. |
| `explode` | Noise burst with low falling sweep | Bomb detonations, rocks/enemies destroyed, missile-defense explosions. |
| `select` | Short square-wave tick | Character selection, block manipulation, checkpoints; also shell START. |
| `die` | Long descending saw wave plus noise | Maze/crossing deaths and losses in shooters, bomb arenas and brick breaking. |
| `powerup` | Two rising triangle-wave sweeps | Fighter selection/round transitions, boosts, power pickups and Sonic springs. |
| `shoot` | Fast descending square-wave sweep | Projectiles, missile launches, hard drops, paddle serves and Sonic dash release. |

Names describe reusable sounds, not mandatory event semantics. For example,
the speed platformer currently uses `hit` for a lost life too. The audit records
what was actually reached; a cue absent from one test route may still exist in
another branch. Sonic springs are explicitly wired to `powerup` even though the
generic audio route does not reach a spring.

Games also use `api.tone(frequency, durationMs, wave)` for custom notes. Existing
examples include kart pre-race rev tones whose pitch follows the rev state,
race countdown notes, Pong wall contacts and Breakout combo tones whose pitch
increases with the combo. There is no background music or adaptive soundtrack
system in this bank.

## Reuse during generation

```js
// Call when the event happens, not every frame the condition remains true.
api.sfx('coin')
api.sfx('hit')
api.tone(400 + Math.min(combo, 12) * 45, 45, 'triangle')
```

This interface is independent of the coding model. The build model is configured
as `gpt-6-astra` at medium reasoning effort. Its runtime reference exposes both
functions, and its prompt requires sound for significant gameplay events while
preserving existing foundation cues without doubling them. Selecting a foundation
therefore includes its sound triggers as well as mechanics/art.

The model/game code still decides **when** to call a cue. The runtime does not
infer a pickup or collision. It adds a START beep and synthesizes requested
effects, with short repeat guards against collision drones. Home previews,
Ready, pause and muted gameplay remain silent.

SQLite's audio tables currently serve indexing/auditing. Playback imports the
compiled bank; neither the runtime nor generation performs a semantic SQL sound
lookup. Inserting another database row alone cannot add a playable cue. A new
named effect requires a recipe in the bank, runtime/API/prompt updates and a
rebuild; custom `api.tone` phrases already work without expanding the bank.

## Verification and reproducibility

- Fresh audio audit: **103/103** catalog, saved-game and template player-mode
  combinations pass; **38** of these are the current 19 catalog packs in both
  modes. Two seeds, up to 1,200 updates each, capture actual runtime audio calls
  after START so the shell beep cannot make a silent game pass.
- **138/138** harness tests pass after the final retrieval/stream regressions;
  harness and cabinet typechecks pass.
- All 19 real menu entries pass the offline browser check. Five additional
  browser checks cover live additions/reordering, revision replacement, retained
  2P selection, transient errors and no autoplay.
- Eight inspector samples play without browser script errors; layouts checked
  at 320 and 736 pixels. Prior runtime browser audio evidence confirms an active
  AudioContext and nonzero waveform, plus silence on pause/mute. This does not
  verify the physical cabinet's speakers or exhaustive event coverage.
- No paid model API calls were used for this work.

Artifacts: `bench/audits/catalog-snapshot.json`,
`bench/audits/audio/gameplay-audit.json`, `bench/audits/home-ui/results.json`,
`bench/audits/home-refresh-ui/results.json` and `bench/audits/audio-ui/`.

To refresh the read-only snapshot:

```sh
node scripts/catalog-snapshot.mjs
```

To refresh the local audio audit and its SQLite records:

```sh
pnpm sounds:check /absolute/path/to/audio-audit.json
```

Neither command invokes a model. The audio command exercises existing code and
records evidence; it does not admit unverified games.
