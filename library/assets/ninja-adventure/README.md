# Ninja Adventure: inspected runtime asset subset

Four actual actor sets: blue ninja, blue samurai, green samurai, and pig.
These are original creator-published CC0 sprites, not newly generated game art.
This is a small subset of the official Godot example, not the full asset pack
advertised on itch.io. See [provenance](LICENSE.md) and [contact sheet](contact-sheet.png).

The three humanoids each have 28 source frames: four-direction walking (four
frames per direction), a directional attack pose, a directional jump pose, and
four special poses in the last row. The last row is **death, item, ability,
second ability**, not four directions of death. The pig has two motion frames,
with horizontal mirroring for the opposite direction. These are complete source
walk sets; they are **not complete Street Fighter animation sets**. Separate hurt,
guard, multi-frame attack, and directional animal poses are absent and explicitly
listed as unsupported.

Fourteen static auxiliary images are also included: five inventory weapons, five
held-weapon images, three destructible props, and a shadow. These do not count as
actors or animated cycles. They have no implied damage or destruction behavior.

## Files and reproducibility

- `original/`: 18 unchanged PNGs with original upstream paths.
- `actors/`: normalized actor JSON, including every source frame.
- `props/`: normalized static pixel JSON.
- `source-tree.json`: pinned upstream Git revision and original blob IDs.
- `manifest.json`: index, file hashes, source/license and exact counts.
- `contact-sheet.png`: original/normalized comparison of representative poses.
- `props-contact-sheet.png`: every static auxiliary source and normalized image.
- `walk-preview.gif`: all supported motion directions, source beside conversion.
- `verification.json`: reproducible integrity and animation coverage checks.

From the repository root:

```sh
python3 library/assets/ninja-adventure/compile.py
python3 library/assets/ninja-adventure/verify.py
```

Pillow is required to rebuild or verify. Runtime use needs no Python, Pillow,
network or PNG decoding: `frame.pixels` is already a `string[]` accepted by
`api.spr`. All four actors plus auxiliary art are well below the 10 MB budget.

## Runtime contract

An actor has `frames`, `animations`, `supportedStates`, and `unsupportedStates`.
Animation keys are exact, such as `walk-down`, `idle-left`, `attack-pose-right`,
and `death-pose`. Each animation references existing `frameIds` and declares
`kind: 'cycle' | 'pose'`, `loop`, and `flipX`. Static poses repeat only while a
game keeps that state active; the asset does not specify attack startup, active
damage, recovery or death duration. Do not infer them from its frame count.

Each frame contains `pixels`, `sourceRect`, `durationTicks`, `anchor`,
`opaqueBounds`, `hurtboxes`, `pushbox`, empty `hitboxes`, and attachment anchors.
The source controller uses six images per second, so frame duration is ten ticks
at the runtime's 60 Hz. For variable `dt`, advance by `dt * 60` ticks. Rendering
must not advance the animation clock independently of update.

Frame coordinates are local to the 16×16 image. Humanoid anchors are `(8,14)`,
matching the source centered Sprite2D with y-offset -6. Pig anchor `(8,13)` comes
from y-offset -5. Draw at `(worldX-anchor.x, worldY-anchor.y)`; scale all geometry
together if scaling is added. For a horizontal flip, rectangle x becomes
`width-x-w` and anchor x becomes `width-anchor.x`. Separate attachment coordinates
must also be mirrored, if a future importer adds them.

Hurtboxes and ground pushboxes are conservative **authored baseline rectangles**,
not bounding boxes automatically inferred from all opaque pixels. A sword or
cape must not enlarge the body's hurtbox. The death pose has no hurtbox. All
attack hitbox arrays are empty because the original one-frame poses alone do not
establish a fighting action's timing or range. The consuming mechanic owns those
facts and must test them against the displayed pose.

## Color conversion and limits

Source pixels map to the runtime's actual PICO-8 palette using reviewed color
overrides in `palette-map.json`, then nearest squared RGB distance with a
deterministic tie break for remaining colors. Naive RGB mapping turned blue cloth
gray and green cloth brown; the explicit overrides preserve clothing identity.
Alpha zero becomes `.`, opaque
pixels become hexadecimal digits. Source files here only have alpha 0/255; the
compiler rejects partial alpha instead of silently inventing compositing. No
resizing, extra outlines or frame invention takes place. Some source shades merge;
the original PNGs are retained so a future renderer can recover full colors.

The contact sheet was visually inspected after conversion: distinct silhouettes,
walking foot positions and action poses survive. Some shading is lost, and color
is more saturated under the fixed palette. These small top-down people are useful
for maze, adventure and arena prototypes, not substitutes for the large side-view
characters requested for a polished fighter.
