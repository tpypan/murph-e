# Runtime API

A game is one JavaScript file that defines three top-level functions:

```js
function init(api) {}          // called once at start and again after every restart
function update(api, dt) {}    // 60 times per second; dt is always 1/60
function draw(api) {}          // right after each update; draw the whole frame
```

Nothing else runs. There is no DOM, no `window`, no `setTimeout`, no
`requestAnimationFrame`, no `fetch`, no imports, no external assets. Keep all state in
variables declared at the top level and rebuild them in `init`. `Math.random`
is seeded by the runtime, so use it freely.

## Screen

`api.W` is 256 and `api.H` is 224. Pixel (0, 0) is top-left. Colours are
default palette indices 0 to 15 for primitives and ordinary sprites:

```
0 black      1 dark blue   2 dark purple  3 dark green
4 brown      5 dark grey   6 light grey   7 white
8 red        9 orange      10 yellow      11 green
12 blue      13 lavender   14 pink        15 peach
```

The runtime draws a score HUD along the top 12 pixels. Keep your own text
below y = 12.

## Input

```js
api.btn(name)    // true while held        name: 'up' 'down' 'left' 'right' 'a' 'b'
api.btnp(name)   // true on the frame it was pressed
```

The runtime handles START itself (title card, restart after game over).
In a one-player game there is only player one. See "Two players" below for
the second player.

## Drawing

Every call clips to the screen. Coordinates are truncated to integers.

```js
api.cls(c)                          // clear the screen to colour c (default 0)
api.pset(x, y, c)                   // one pixel
api.pget(x, y)                      // default palette index 0..15; see custom-color note below
api.line(x0, y0, x1, y1, c)
api.rect(x, y, w, h, c)             // outline
api.rectfill(x, y, w, h, c)         // filled
api.circ(x, y, r, c)                // outline
api.circfill(x, y, r, c)            // filled
api.spr(sprite, x, y, flipX, flipY, colors) // optional flips and per-sprite palette
api.text(str, x, y, c)              // 8x8 pixel font, uppercase; 8 px per character
api.textCenter(str, y, c)           // centred horizontally
api.text(str, x, y, c, 2)           // optional last argument scales the font (2 = 16 px)
api.textWidth(str)                  // width in pixels
```

A sprite is an array of equal-length strings, one character per pixel:
`'0'`..`'9'` and `'a'`..`'f'` are palette indices, `'.'` is transparent.
Define sprites once as constants at the top of the file; they are cached by
identity, so do not build them inside `draw`.

```js
const SHIP = [
  '...7....',
  '..777...',
  '.7c7c7..',
  '77777777',
  '..8..8..',
]
api.spr(SHIP, x, y)
```

The optional sixth argument preserves a sprite's own colors: a `readonly string[]`
with 1–16 complete `#RRGGBB` entries. Pixel characters index that array. `.` remains
transparent; slot `0` is an ordinary **opaque** color, including opaque black.
Omitting `colors` keeps the exact default rendering. Primitives still use the
default palette. Multiple sprites can use different palettes in the same frame.

```js
const HERO_PALETTE = ['#000000', '#0033ee', '#0066ff', '#0088ff'];
const HERO = ['.12.', '0230'];
api.spr(HERO, x, y, false, false, HERO_PALETTE);
```

Define palettes once, like sprites. Palette arrays are validated and snapshotted
on first use; mutation afterward has no effect. Reusing the same pixel array with
another palette is supported. Invalid colors, more than 16 entries or a pixel
index outside the supplied palette cause a clear runtime error; no silent color
conversion occurs while drawing. Transparency preserves the previous pixel; later
opaque sprites, primitives, text, clear and flash overwrite it normally.

`pget` keeps its 0–15 compatibility contract. For custom colors it returns the
nearest default color by squared RGB distance, with the lower index breaking ties.
It returns 0 outside the screen. Consequently, `pset(x,y,pget(...))` is exact for
legacy pixels and explicitly lossy for custom art. Do not use approximate color
readback as a sprite collision mask.

## Sound

```js
api.sfx(name)                 // 'jump' 'hit' 'coin' 'explode' 'select' 'die' 'powerup' 'shoot'
api.tone(freq, ms, wave)      // wave: 'square' (default) 'triangle' 'saw' 'noise'
```

Play a sound on every event that matters: a pickup, a hit, a shot, a death.
Trigger effects once per event in update, never in draw or on every frame of a
held button/collision. The shared bank is already bundled locally; no audio
download or generation is needed. Catalog factories already trigger their own
gameplay cues. Use short tones for extra countdowns or transitions.

## Juice

```js
api.flash(c, frames)   // fill the screen with colour c for a few frames (default 7, 3)
api.shake(frames)      // shake the screen (default 8)
```

## Score and game flow

```js
api.score(n)       // set the score
api.addScore(n)    // add to the score
api.getScore()     // read it
api.gameOver()     // show GAME OVER with the score; START restarts by calling init again
api.win()          // same, with YOU WIN
```

The runtime draws the score and the high score. Do not draw your own.

## Two players

`api.players` is 1 or 2 and never changes during a game. In a two-player
game both players share one cabinet display. Shared arenas suit most games;
independent racing views can occupy compact regions of that same framebuffer.
Player one is index 0 and player two is index 1:

```js
api.btn('left', 1)      // player two holding LEFT
api.btnp('a', 1)        // player two pressed A this frame
api.addScore(1, 0)      // one point to player one
api.addScore(10)        // no index in a 2P game: both players get it (co-op)
api.getScore(1)         // player two's score
api.win(1)              // "PLAYER 2 WINS"; api.win() with no index is YOU WIN
api.gameOver()          // both players lose; the end card shows both scores
api.P1, api.P2          // the player colours, 12 (blue) and 8 (red)
```

Draw player one in `api.P1` and player two in `api.P2` so people know
which one they are. The HUD shows `P1 <score>` and `P2 <score>` in those
colours. Both players use the same controls (d-pad, A, B), each on their
own pad. A versus game ends with `api.win(winner)`; a co-op game ends with
`api.gameOver()` when the shared lives run out.

## Helpers

```js
api.rnd(n)                    // random float in [0, n); rnd() gives [0, 1)
api.rndi(a, b)                // random integer from a to b inclusive
api.clamp(v, lo, hi)
api.dist(x0, y0, x1, y1)
api.collide(ax, ay, aw, ah, bx, by, bw, bh)   // true if the two boxes overlap
api.t                         // seconds since init
api.frame                     // frames since init
```
