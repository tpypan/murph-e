# Arcade source library

The researched source index for preparing sprite packs is separate from the runtime-ready catalog. The original Arcade survey contains **16 games and 87 sheet links**. The DC Arcade and Sonic Genesis additions bring the combined index to **19 games and 92 sheet links**, with 13 downloaded PNGs. The three `spriters-resource-*.json` manifests are authoritative; `pnpm harness catalog index` rebuilds SQLite `reference_games` and `reference_sheets`.

Latest imports: [Sonic](../../docs/research/sonic-native-admission.md) supplies a source-art momentum platformer; [DC Arcade](../../docs/research/dc-arcade-imports.md) supplies Batman, Joker and Superman pose collections. The DC imports are not complete fighting sets. [Spider-Man](../../docs/research/spider-man-fighter-admission.md) now has 84 frames and 19 clips admitted for the authored fighter adapter, including layered web effects. Earlier prototype figures below describe historical import stages, not current admission.

| Our family | Source games | Useful material |
| --- | --- | --- |
| Fighter | [Street Fighter II](https://www.spriters-resource.com/arcade/streetfighter2/), [Marvel vs. Capcom](https://www.spriters-resource.com/arcade/marvelvscapcom/), [Street Fighter Alpha 3](https://www.spriters-resource.com/arcade/streetfighteralpha3/) | Character sheets, stages, impact effects, portraits, health bars |
| Maze | [Pac-Man](https://www.spriters-resource.com/arcade/pacman/) | General sprites, maze parts, palettes, HUD |
| Climber | [Donkey Kong](https://www.spriters-resource.com/arcade/dk/) | Characters/objects, tiles, four stage references |
| Crossing | [Frogger](https://www.spriters-resource.com/arcade/frogger/) | General sprite sheet for component extraction |
| Brick breaker | [Arkanoid](https://www.spriters-resource.com/arcade/arkanoid/) | Vaus paddle, enemies, fields, bricks, powerups |
| Bomb maze | [Bomberman World](https://www.spriters-resource.com/arcade/bombermanworld/) | Bomberman and enemies; complete arena tileset not confirmed |
| Falling blocks | [Tetris (Atari)](https://www.spriters-resource.com/arcade/tetrisatari/) | Block tiles and assembled forms |
| Formation shooter | [Galaga](https://www.spriters-resource.com/arcade/galaga/page-1/) | General sprites, screens, text |
| Racing | [Pole Position](https://www.spriters-resource.com/arcade/poleposition/), [Out Run](https://www.spriters-resource.com/arcade/outrun/), [Mario Kart Arcade GP 2](https://www.spriters-resource.com/arcade/mariokartarcadegp2/) | Pole Position has inspected rear-view car poses, wheel variants, crashes, gantries and signs; Out Run has vehicle/driver art; Mario Kart contributes HUD/items/maps/portraits, not a verified 2D driver animation set |
| Future brawler | [Final Fight](https://www.spriters-resource.com/arcade/finalfight/), [Teenage Mutant Ninja Turtles](https://www.spriters-resource.com/arcade/tmnt/) | Fighter/weapon poses, enemies, stages, pickups |
| Future run-and-gun | [Metal Slug 6](https://www.spriters-resource.com/arcade/ms6/) | Character/weapon poses, enemies, vehicles, stage art, effects |

## Query and state

```sh
pnpm harness catalog sources "spider man"
pnpm harness catalog sources "maze"
pnpm harness catalog sources "fighter effect"
pnpm harness catalog index
```

`discovered` means the sheet link was observed on its game page. `downloaded` additionally requires a local regular PNG, matching SHA-256/IHDR dimensions and a matching provenance sidecar. Missing or changed cached files cannot retain downloaded status. Raw cache and derivatives live under gitignored `data/reference-cache/`.

Every source entry has `runtimeReady: false`: this registry cannot grant asset admission. A finished import belongs in the separately validated sprite catalog with actual per-state crops, frame durations, anchors, hit/hurt geometry, unsupported-state declarations and source/rights provenance. A successful short runtime probe alone cannot promote a sheet. The source-checked Ninja Adventure pack demonstrates the runtime asset path.

Eight raw sheets are cached: SF2 Ryu (`60224`), MVC Spider-Man (`275483`), Donkey Kong characters/objects (`252263`) and tiles (`106602`), Pole Position F1 Car (`94319`) and Miscellaneous (`97926`), and Pac-Man General Sprites (`52631`) and All Assets/Palettes (`159361`). Five Donkey Kong community animation GIFs are cached alongside the character sheet as separate timing references. The [Spider-Man import audit](../../docs/research/spider-man-sheet-audit.md) documents a local 57-frame prototype with authored timing/boxes, uncertain hurt/KO mappings, an explicit fixed-palette baseline, and a 55-frame exact-RGB proof. Two web-effect frames exceed the per-sprite 16-color cap and remain unsupported in that exact subset. It is not a complete or faithful Capcom mechanics import.

Pole Position's car sheet is credited to Sonicfan32; the miscellaneous sheet is uploaded by Yawackhary with Sonicfan32 credited as a contributor. Its signs/maps include edition-specific material, so the archive's game label is not proof that every element belongs to the first game. Road projection, driving rules, source timing and collision dimensions must be supplied separately from these PNGs.

The [Pole Position import audit](../../docs/research/pole-position-sheet-audit.md) maps twelve source car/crash poses, four explicit mirrored poses and four source palette samples into four vehicle variants. Native source pixels and opaque black are retained; projected draw size is handled by the racing adapter. The 64 variant frames are not 64 distinct original poses. Gantries/signs/maps remain cached references.

The [Pac-Man import audit](../../docs/research/pac-man-sheet-audit.md) maps the General Sprites sheet into native 16×16 player movement/death, all four directional ghost sets, frightened/flash, and returning-eye poses. The 64 runtime frames include one authored blank death hold; reform clips reuse source eyes/body artwork with authored timing. Exact source RGB is retained, while the baked black backdrop receives a documented border-connected transparency mask. The full palette atlas is cached for reference; no alternate colors are invented for player two. Maze topology, release/return rules, collision and simultaneous two-player behavior remain project mechanics.

## Import order

1. Spider-Man's authored fighter adaptation is reviewed; original Capcom timing and move fidelity are not claimed. Cached Ryu remains a candidate for a second source-art fighter import.
2. Pac-Man actor import is mapped; validate its adapter and pursue maze parts/HUD separately. Keep ghost-house lifecycle and maze topology in tested mechanics.
3. Donkey Kong native character/object import is mapped and tested on the existing climber; original stage topology and hammer/lift rules remain separate work. See [the audit](../../docs/research/donkey-kong-sheet-audit.md).
4. Frogger, Galaga and Arkanoid: compact sheets closely matching existing foundations.
5. Pole Position car import is mapped onto the racing adapter; original qualification rules, track topology and source scenery remain separate work. Continue Bomberman, Tetris and racing scenery, then larger brawler/run-and-gun sets once those mechanics exist.

Do not pair a portrait or assist-only sheet with a request for a fully animated playable character. Thor/Iceman/Jubilee on the selected Marvel page are tagged `assist`. Archived art does not supply timing, attack rules, collision maps or game source code. Keep authored metadata labelled separately from recovered game data.

No suitable source sheet was indexed in this pass for Pong, Asteroids or Missile Defense. They retain original procedural artwork; this is not a claim that no archive entry exists. Batman and Flash are also not provided by the selected Marvel pages.

Source availability and technical readiness are separate from permission to redistribute. Each record retains the [archive terms](https://www.spriters-resource.com/page/tou/) and a commercial-game-art classification; none is labelled CC0 merely because it is downloadable.
