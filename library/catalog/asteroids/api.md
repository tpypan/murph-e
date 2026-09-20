`ARCADE.asteroids(config)` returns `{init(api),update(api,dt),draw(api),inspect(),distanceBetween(a,b)}`. Create inside `init` and delegate lifecycle calls. Cabinet `api.players` is authoritative. Complete original inertia-driven shooter with 79 saved ship-orientation/thrust, rock, saucer and explosion frames; no external assets/imports/network at runtime.

The ship rotates and accelerates along its heading; velocity persists on release. Ships, rocks and projectiles wrap through a 256×200 arena below the 24-pixel header, and both collision and sprite copies use that topology. Large rocks split into two medium rocks; medium rocks split into two small rocks. New fragments have a brief emergence grace. Saucers announce for 0.95 seconds before entering and firing aimed, non-homing shots. Clear rocks to advance three default sectors. Safe respawns, life loss, death burst, brief protection, sector intermissions and terminal states are included. 2P uses separate ships, inputs, scores and lives, no friendly fire, and shared sector goals; a cleared sector revives an eliminated teammate with one life.

Controls: LEFT/RIGHT rotate; UP thrusts; DOWN brakes; hold A to fire; B hyperspaces to a safer sampled position, grants brief protection and then recharges for six seconds. B is not a weapon. Motion remains inertial even at the default small drag.

Supported config:
- `waves`: integer 1–8, default 3. `lives`: 1–8 per player, default 3.
- `initialRocks`: initial large-rock count, default 3; actual count is bounded 2–7 and grows each sector.
- `drag`: exponential velocity damping 0–2 per second, default 0.24. Set 0 for frictionless inertia. DOWN still applies strong braking. Acceleration, rotation and speed remain bounded.
- `difficulty`: 0–1, default 0; increases rock/hostile-shot speed.
- `seed`: deterministic integer hazard seed, default 7. Rendering never consumes randomness.
- `shipColors`: up to two palette indices for ship accents. A palette/label swap is not a named-character adaptation.
- `players`: standalone fallback only if `api.players` is absent; normally omit.
- `assets`: complete override sets named `ship`, `rock1`, `rock2`, `rock3`, `saucer`, `burst`; invalid names/clip data fail clearly.
- `onRockSplit({player,size,children,value,wave},api)`: once per destroyed rock (including zero children for the smallest). `onWaveClear({wave},api)` and `onHit({player,lives,wave},api)` run after their real events. Add theme rewards through `api.addScore`; later scoring preserves them.

Animation shape is `{width,height,frames,animations}`, dimensions 1–48. Each frame stores exact hexadecimal pixel rows (`.` transparent), anchor, frame duration and hit/hurt geometry. Clips are `{frames:[frameId],frameMs,loop}`. Match `assets.json`: ship requires `heading0`…`heading15` and `thrust0`…`thrust15` (zero points up, increasing headings rotate clockwise), rocks require `rotate`, saucer `fly`, burst `explode`. Center anchors are used. Preserve the controller's footprint or explicitly extend collision: ship radius 6; large/medium/small rocks 13.6/8.8/4.8; saucer 10; bullet 1.5. Arbitrary custom pixels do not automatically resize physics.

`inspect()` provides copied diagnostics. `distanceBetween({x,y},{x,y})` returns the same toroidal distance used by collisions—useful for explicit wrapper collectibles or tests. It exposes no state mutation. Rocks are capped at 56, player shots at eight each with a 0.9-second TTL, and hostile shots at eight; spawning/safe-position searches are bounded. Scoring is 20/50/100 by rock size, 250 per saucer, and 500 per cleared sector per player. All people eliminated calls `gameOver`; completing sectors calls cooperative `win()`.

This is a polished small vector-style arcade foundation, not orbital gravity simulation, navigation through solid terrain, a scrolling shooter, inventory or a commercial game-source port. Implement requested unsupported mechanics explicitly. All bundled code/art is original.
