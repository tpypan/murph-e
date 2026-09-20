# Optional sprite palette

The existing JavaScript templates continue to use the fixed PICO palette unchanged.
An authored or imported sprite can preserve up to sixteen opaque colors with the
optional sixth `api.spr` argument. This snippet can be added to a game's existing
draw function; it does not add another loop or external asset request.

```js
const HERO_PALETTE = ['#000000', '#0033ee', '#0066ff', '#0088ff'];
const HERO = ['.12.', '0230'];

// Inside draw(api): x/y are the sprite's top-left coordinates.
api.spr(HERO, x, y, false, false, HERO_PALETTE);
```

`.` leaves the background untouched and `0` draws opaque black. Store both arrays
once and treat them as immutable. All nontransparent indices must exist in the
palette. Do not pass an RGB string to primitive color arguments: their 0–15
meaning is unchanged. `pget` approximates custom colors to the nearest default
index, so use game geometry for collision rather than comparing rendered colors.
