# Climber foundation: ARCADE.climber(config)

Returns `{ init(api), update(api, dt), draw(api), inspect() }`. Delegate your game's lifecycle to these functions. The bundled factory includes the complete original scene, 33 saved sprite frames and physics. No imports, assets, network or external engine are required in the generated game.

## Default game and rules

Five sloped construction girders, linked by eight ladders. A visibly animated gorilla at the upper-left telegraphs barrel throws. Barrels roll downhill, bounce to the next girder at an edge or sometimes choose a usable ladder. The bottom-right oil drum receives barrels; later stages add fire hazards. Broken secondary ladders are visibly incomplete, and every floor always has a usable required route.

Walk LEFT/RIGHT, use UP/DOWN only at a ladder, and press A to jump. Holding A preserves full jump height; a tap shortens it. Jumping over a rolling barrel awards 100 once per hazard and player. Reaching each new floor awards 100 once per stage. Get to the kitten's top-right cage to rescue it, award the remaining time bonus plus 1000, and advance to the next of three layouts. Three stages win the default game. Timer expiry costs a life. A hit animates, consumes one life, then respawns at the highest reached floor with temporary protection. All available lives exhausted loses; START resets through the runtime's normal lifecycle.

2P is cooperative on the same full-size screen: separate inputs, lives and individual skill score. Either player can reach the rescue goal for the team; stage-clear bonus goes to both. A zero-life player is revived with one life after the teammate clears a stage. They never block one another physically. Team victory calls `api.win()` without assigning a competitive winner. The cabinet's `api.players` is always authoritative, including explicit 1P.

## Supported configuration

- `stages`: integer 1–6, default 3. Three distinct ladder/slope layouts cycle; hazard cadence and speed escalate with stage.
- `lives`: 1–6 per player, default 3.
- `timeLimit`: 30–240 seconds per life, default 100.
- `difficulty`: 0–1, default 0. Adds barrel speed and shortens throw cadence; bounded by the controller.
- `bonus`: initial stage bonus, default 5000, minimum 3000. Decays with elapsed time; displayed/awarded in hundreds.
- `seed`: integer hazard-choice seed, default 7. Same seed and controls give the same paths. Drawing never consumes randomness.
- `goalX`: rescue cage center 184–234 on the top girder, default 226.
- `girderColor`: palette index 0–15, default 8. Keep sufficient contrast with black scenery and ladders.
- `players`: standalone fallback only when `api.players` is absent; normally omit.
- `avatars`: up to two `{overalls, helmet, sprites?}` entries. Colors are palette indices. The default is original workers in blue/red overalls and distinct helmets.
- `targetSprites`: optional complete target sprite set with `wait` and `rescued` clips. The default target is an original kitten. Changing only colors does not constitute a named character adaptation.
- `art`: optional `{gorilla, barrel, fire}` animation-set overrides, independently optional. Required clips: gorilla `idle`/`throw`, barrel `roll`/`fall`, fire `burn`/`explode`. Maximum canvases are 48×48, 16×16 and 24×24 respectively. These replace visuals without changing collision or motion. Gorilla feet are placed at x=39 on the top girder; its 0.5-second throw telegraph ends with the barrel spawning at x=65. Fit the release pose and animation timing to those positions.
- `cage`: default true; false removes the cage around a custom rescue target.
- `rescueText`: optional short stage-clear message, uppercased and limited to 25 characters. Default `CAT RESCUED!`.
- `canRescue({player, stage}, api)`: optional predicate. Return `false` to require additional objectives in your wrapper (for example collecting three keys). Draw and implement those extra objectives in the wrapper; don't claim them from this module alone.
- `onFloor({player, floor, stage}, api)`: called once when the player first reaches a new floor (zero-based floor). May add themed bonuses.
- `onJumpOver({player, hazard, stage}, api)`: called once per player/barrel award; `hazard` is the unique event ID.
- `onHit({player, cause, lives}, api)`: called after a real hit/life penalty (`barrel`, `fire`, `fall`, `timeout`).
- `onRescue({player, stage, bonus}, api)`: called once per rescue after base scoring.

Hooks are synchronous and have no hidden model/tool calls. Scores added through `api.addScore` are preserved. The read-only `inspect()` exposes copied people/hazard/layout state for tests and wrapper observations; it does not offer teleportation or mutable game internals.

## Custom animation-set shape

Use `assets.json` → `sets.worker` as a complete compatible example. Each set is `{width, height, animations, frames}`. A frame contains `pixels` (exact rectangular hex-palette rows with `.` transparency), an integer `anchor: {x,y}`, `durationMs`, `hurtboxes`, `hitboxes`, and optional sockets. A clip contains `frames` (frame IDs), finite `frameMs >= 16`, and `loop`. Missing or malformed drawing data is rejected at init rather than silently substituted.

A frame can supply `palette: ['#RRGGBB', ...]` with 1–16 exact opaque colors; every nontransparent pixel index must exist in it. These frames retain source colors and ignore the default overalls/helmet recoloring. Frames without `palette` keep the ordinary runtime palette and existing clothing options. Palette metadata does not supply missing animation, collision or gameplay states.

**Player avatars are compact skins of the existing controller.** Each avatar canvas must be at most **24×24**. Every frame must use the same bottom-center foot anchor `{x: Math.floor(width / 2), y: height}`. Nontransparent pixels must stay within **x offsets −10 through +9 and y offsets −20 through −1** relative to that anchor. Transparent padding is permitted inside the 24×24 canvas. Thus the standing/walking/climbing/jumping/hurt/death artwork can be at most 20 pixels tall and 20 pixels wide. All six clips are required: `idle`, `walk`, `climb`, `jump`, `hurt`, `death`. The built-in 16×20 worker is the preferred starting point. A 28×44 worker is rejected, even when its animation names and anchors otherwise look valid.

These limits are intentional: the five sloped girders are about 34 pixels apart, with less clearance at the narrow ends. A 44-pixel figure intersects the next platform. The controller keeps its existing half-width 4 and height 16 collision body; visual trim can extend beyond that compact body. Sprite `hurtboxes`/`hitboxes` are asset metadata and do **not** change these mechanics. A larger physical character requires an explicitly implemented and tested layout/controller extension, not just larger images.

**Rescue targets have a separate limit:** `targetSprites` can use a canvas up to **48×48**, with integer anchors inside or on its bounds and required `wait`/`rescued` clips. The stationary target sits on the top girder, so it is not subject to the moving avatar's 20-pixel corridor clearance. Keep its foot anchor near the bottom center and design it to fit the cage and screen; the default kitten is 16×16 with anchor `{x:8,y:15}`. The target limit does not apply to player avatars.

## Boundaries

The gorilla/worker/kitten are original themed characters. This captures a classic barrel-and-ladder arcade structure; it does not reproduce a copyrighted level, art sheet or original source. It does not include hammer combat, free scrolling, moving lifts or arbitrary generated level topology. A requested hammer/weapon, boss fight, new physical character size or moving-platform stage must be implemented as an explicit tested extension.
