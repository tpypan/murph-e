# Airplane racing: ARCADE.skyRacer(config)

Returns `{ init(api), update(api, dt), draw(api), inspect() }`. Create a fresh instance
inside the game's `init`, then delegate all three lifecycle calls. Source, pixel art,
items, HUD and sounds are bundled automatically; do not print them again.

Single player only, against three rival planes. Forward flight is automatic;
LEFT/RIGHT steer, UP/DOWN change among three altitude bands. A uses the held item;
B gives a 0.7-second boost with a default 2.7-second cooldown. Item crates award
a gust boost, homing balloon or cloud puff. Airborne checkpoint gates, shortcut
rings, clouds, storm balloons, wind and course boundaries affect the race.
Three spin-outs cause a three-second checkpoint rescue, not immediate defeat.

Three laps per race and three races per cup. Race results advance with A after
1.2 seconds, or automatically after six seconds. Cup points are 15/10/6/3 by
placement. The player wins if their total equals or exceeds every rival; otherwise
the game ends in defeat. Runtime score adds 10/checkpoint, 50/clean shortcut and
the race's placement points. Do not award these again in wrappers.

Optional settings (unknown keys and invalid numbers are rejected):

- `rivalSpeed`: multiplier 0.6–1.3, default 1. Changes rival forward speed.
- `boostCooldown`: 0.7–8 seconds, default 2.7. Includes the boost's duration.
- `planePalette`: exactly eight `#RRGGBB` colors for the player plane.
- `courseNames`: three nonempty names, converted to uppercase and capped at 18 characters.
- `racerNames`: four nonempty names, player first; uppercase, capped at 9 characters.

`inspect()` returns copies of race, phase, finished, placement, time, cup points,
player, rivals, course objects and particle count. It is for offline tests; modifying
these copies does not change the game. No scoring, input or drawing hooks are exposed.

This is an overhead arcade racer, not a 3D flight simulator. It does not support
two human players, free flight, dogfighting, guns, custom items, changing the lap/cup
count or custom aircraft geometry. These need an explicit extension. Do not select
it for a different core loop merely because planes appear in the request.
