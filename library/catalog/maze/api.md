`ARCADE.maze(config)` returns `{init(api),update(api,dt),draw(api),inspect()}`. Instantiate inside your top-level `init` and delegate update/draw. The complete maze, artwork, movement, enemy lifecycle, HUD and terminal flow are already implemented and linked into the final game file. Do not print their source or regenerate the supplied pixels. `api.players` is authoritative: 1 is solo; 2 means independent players on the SAME maze with shared score/progress, not versus.

```js
let game;
function init(api) {
  game = ARCADE.maze({ avatar:'goose', huntMode:'player-hunts', levels:3, capturesToClear:8 });
  game.init(api);
}
function update(api,dt) { game.update(api,dt); }
function draw(api) { game.draw(api); }
```

Two policies are explicitly different:
- `huntMode:'classic'` (default): collect every pellet/power pickup. Four ghosts chase/scatter, temporary power permits captures, normal ghost contact costs a shared life. Clear all configured rounds to win.
- `huntMode:'player-hunts'`: ghosts ALWAYS flee and can ALWAYS be captured. Ghost contact NEVER damages the player, even after a power pickup expires. Reach the capture target before time expires. Power pickups boost player speed and capture score. This is the setting for “Pac-Man but a goose chasing ghosts”; never substitute temporary role reversal.

Supported config:
- `avatar:'chomper'|'goose'`, default chomper. Both contain complete original four-direction movement/death clips; goose also has honk clips. Unknown identities throw. Display labels cannot create different artwork.
- `assets:{frames,animations}`: optional complete native sprite replacement for the selected avatar and ALL ghost states (36 clips for chomper, 44 for goose). Use a supplied reviewed set, never a guessed partial object. Frames have rectangular 1–24px hexadecimal pixel rows, `.` transparency, an integer in-frame `anchor:{x,y}`, and optional 1–16 exact `#rrggbb` colors in `palette`. Animations use the bundled clip names, `loop:boolean` and `frames:[{frame:id,duration:ticks}]` at 60Hz. Death must finish without looping within 75 ticks; reform within 45. Artwork timing and palette change rendering only: the controller retains its reviewed collision boxes, including non-colliding returning/reforming ghosts. The factory copies and validates supplied art before play.
- `playerMarkers:true`: optional small colored 1/2 labels beneath actors in 2P, useful when source art uses the same character/color for both players; default false.
- `levels`: integer 1–8, default 3. `lives`:1–9, default 3 (classic only). `capturesToClear`:1–30, default 8 (hunter); target rises by 2 each level, capped 30. `huntSeconds`:20–180, default 60; each hunter level resets this clock.
- `ghostCount`: classic 0–4, default 4; hunter 1–4. Ghosts have direct pursuit, four-tile ambush, flanking/second-player targeting, and shy/corner roles. Chase/scatter periods are bounded. Ghost speed rises slowly across levels and remains bounded.
- `playerStepFrames`:6–14, default 8 per 10px tile. `ghostStepFrames`:9–22, default 11; frightened ghosts are 3 frames slower. Returning eyes use 4 frames/tile. Lower means faster.
- `playerStarts`: two legal corridor `{x,y}` tiles, default `[{x:9,y:15},{x:10,y:15}]`; only first is used in 1P.
- `layout`: optional 19 equal-width strings of 19 cells; `#`wall, `.`pellet, `o`power, space corridor, `H`house, `=`door, `T`tunnel. Keep H at(8,8),(9,8),(10,8),(9,9), door(9,7), accessible exit(9,6), and paired T at(0,9)/(18,9). Every pickup and both starts must be connected. Invalid maps throw before play. The supplied map is original and already validated.
- `wallColor`: palette index, default 12. `sound:false` disables event sounds. `onEvent(event,api)`: optional hook for pickup/capture/honk/ghost lifecycle/level/life/time events; details are read-only values. `drawOverlay(api,{phase,level,remaining,captures,timeLeft})`: optional last-pass drawing; keep maze/HUD readable.
- `inspect()`: detached test snapshot with players, ghosts, pellets, event history and state; not a mutation interface.

Controls: directions buffer the next legal turn; reversal is immediate within a corridor. A is honk ONLY for goose+player-hunts: briefly stuns nearby fleeing ghosts with a 3 second cooldown. A is otherwise unused. B is always unused. START belongs to the shell. The READY banner accepts movement and honk immediately, with ghosts safely waiting; players initially stand still until a direction is selected. Shared lives reset both actors on a classic death; consumed pellets persist. A level reset restores pellets, actors, house timers and power. House cells/door are player-forbidden. Captured eyes must travel home before reform/release; returning-eye and reform frames have no collision boxes. 2P scores are credited once to each player for each shared reward, not duplicated per collision.

This is an original maze-chase foundation, not a exact Pac-Man ROM/map, a platformer, or a general arbitrary-character sprite database. Honor unsupported requested changes with explicit additional implementation rather than invented config fields.
