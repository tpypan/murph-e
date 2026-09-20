`ARCADE.formationShooter(config)` returns `{init(api),update(api,dt),draw(api),inspect()}`. Create the factory inside your `init`, then delegate all lifecycle calls. It ships a complete original fixed-screen alien formation game and 30 pixel frames; no runtime imports or downloads. Cabinet `api.players` always determines 1P/2P.

Default game: four ranks of eight aliens march faster as enemies disappear; ranks descend at arena edges. At most two enemies simultaneously telegraph a dive for 0.75 seconds before committing to a visible path; they return to the formation from above after passing below the player. Enemy bullets launch from exposed bottom ranks. Four destructible shields protect the player, but either side's shots cut persistent holes. An announced bonus UFO crosses above the ranks. Clear three waves for a terminal team win. Lives, death burst, safe respawn/protection, wave intermission, difficulty escalation and score are included. 2P shares the arena with independent movement, lives, shots and shields. No friendly fire; wave clear revives an eliminated teammate with one life.

Actual controls: LEFT/RIGHT move horizontally. Hold A to fire. B activates an 0.85-second energy shield, then recharges for six seconds. UP/DOWN have no action. Do not label B as a bomb or add invented movement to the spec.

Supported config:
- `waves`: integer 1–8, default 3. `lives`: 1–8 per player, default 3.
- `rows`: 2–4, default 4. `columns`: 4–8, default 8. This changes formation size, not input or bullet physics.
- `difficulty`: 0–1, default 0; increases firing/dive frequency and bullet speed within bounded limits.
- `shields`: false disables terrain bunkers; default true. This does not remove B's energy shield.
- `seed`: integer deterministic hazard seed, default 7. Draw never advances randomness.
- `shipColors`: up to two palette indices recoloring the ship's cyan accent. A color change is not a new character identity.
- `players`: standalone fallback only when `api.players` is absent; omit normally.
- `assets`: map overriding complete bundled sprite sets: `ship`, `alien0`, `alien1`, `alien2`, `ufo`, `burst`. See shape below. Unknown set names and missing required animation clips throw instead of silently substituting unrelated art.
- `onKill({player,enemy,diving,wave,value},api)`: once per uniquely identified enemy; can add explicit theme rewards.
- `onWaveClear({wave},api)`: once after wave scoring. `onHit({player,lives,wave},api)`: after a real life loss. Hook scores written through `api.addScore` are preserved.

Asset set shape: `{width,height,frames,animations}`; dimensions 1–48. Frame `{pixels:string[],durationMs,anchor:{x,y},hurtboxes,hitboxes,sockets?}` uses exact rectangular hexadecimal palette rows and `.` transparency. Clip `{frames:string[],frameMs,loop}` points to actual saved frames. Keep every clip from the corresponding `assets.json` set: ship `idle/fire/shield`, each alien `march/dive/warn`, UFO `fly`, burst `explode`. Anchors are entity centers. Presentation overrides do not silently change the documented physics footprints (ship 10×12, aliens 12×8, UFO 20×8). New character shapes needing different collision need an explicit tested extension.

`inspect()` returns copied diagnostic state, including entities, projectiles, shield cell counts, timers and stats. It cannot mutate game state. Scores: marching aliens 50–80, diving aliens 200, UFO 500, wave clear 500 to each player. Player shots have a cooldown, TTL and eight-shot per-player cap; enemy bullets are capped at 12. Lives reaching zero for the team calls `gameOver`; completing all waves calls `win()` without a competitive winner.

Boundaries: a formation shooter, not scrolling terrain, a bullet-hell boss, capture/dual-ship mechanic or a faithful commercial game reproduction. Implement those requested mechanics explicitly rather than claiming unsupported config keys do so. All bundled art/code is original.
