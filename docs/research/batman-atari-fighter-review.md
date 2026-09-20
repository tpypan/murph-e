# Atari Batman source fighter adaptation — 2026-09-19

The full cached [Atari Batman arcade sheet31098](https://www.spriters-resource.com/arcade/batman/asset/31098/) supports a playable fighter adaptation with explicitly declared pose reuse. It does **not** establish every original game state. The new private source actor `dc-batman-atari-fighter/batman` has33 frames and17 clips:16 required character clips plus one held-prop travel clip. It is source-checked and compatible with the documented fighter1.3 contract. The separately playable, character-selecting `batman-atari-fighter-reference` adapter is verified. The earlier22-frame/five-clip `dc-batman-arcade` pack remains byte-for-byte unchanged.

## Source coverage and honest reuse

| Fighter state | Observed source art and authored adaptation |
| --- | --- |
| Idle / walk | Six first-row stepping poses; idle deliberately holds walk1. No distinct original idle animation is claimed. |
| Jump | Seven second-row airborne/cape poses; their timing and trajectory registration are authored. |
| Light / heavy | Clear forward fist and extended standing kick, with observed windup/recovery poses. |
| Sweep | Actual low extended-leg pose with crouch preparation/recovery. |
| Air light / air heavy | Both buttons use the actual flying-kick silhouette with different authored timings. There is no claimed source aerial punch. |
| Guard / crouching guard | Authored protective holds using visible raised-fist and crouching poses. Original guard labels are absent. |
| Hurt | Actual lower-sheet stagger/hunch poses. One is marked unused on the source; that fact is retained. |
| KO | Actual bottom-row collapse, cloak fall and fully prone sequence. No mirrored attack is labelled KO. |
| Victory | Deliberately holds the neutral ready stance. No original celebratory/victory sequence was identified. |
| Grounded special | Observed curved held-prop windup and forward-throw body pose; a crop of the held prop supplies authored travel. |
| Optional dash | Authored lunge using observed forward-reaching/stepping poses. The normal adapter special is the source-prop throw. |

The held prop is visibly curved, but the sheet has no action or projectile labels. Its original identity, timing and flight animation are unverified. The effect is a crop of pixels held in the character's hand, **not** a separately labelled original projectile or recovered batarang animation. It does not invent spinning frames. Original grappling, climbing, throws, aerial punch and original game physics remain unsupported.

Key source rectangles are retained per frame in actor.json. The held-prop crop is `[83,848,100,864]`; the active throw body is `[226,840,325,930]`. The reviewed emitter is source point(315,876), transformed into active-frame pixel socket(59,14). It lies at the visible forward hand. The source-preview contact includes a red socket cross, the actual windup/throw and extracted prop. Travel speed3.5px/tick, life90 and an8×6px collision box are authored. Default controller damage/meter rules remain unchanged.

## Pixel treatment and review

Source SHA256 is `b394fc88ff78734fe1976da90d3d081e1665c5f151d7fad5975d8e1f20b23c2a`. The source archive credits Yawackhary. The import uses nearest-neighbor2/3 spatial scaling and retains every resulting source RGB value in palette planes; there is no recoloring or quantization. Green sheet backing becomes transparent. Two disconnected unused-marker asterisks, explicitly identified by source rectangles, are excluded from reaction crops; source body pixels are not painted over. Exact rectangles and transformations are stored with each frame.

All33 serialized frames are independently decoded to RGBA and checked against their transformed source crops. Native fighter rendering then checks every frame in both directions:66 comparisons, zero RGB/transparency mismatches and zero fixture clipping. A brighter original stage sky (runtime color13) helps the dark film-style suit remain readable without changing its colors.

Source contact, native kick/contact, standing/crouching guard, real zero-HP collapse/prone KO, throw/emission/travel and character-selection views were visually inspected. The source's restrained dark silhouette is retained; this does not claim Marvel-style proportions or a brighter redesigned suit.

## Native mechanics and actual demo

Thirty ordinary-input cases cover every character clip in both directions. Standing guard uses close valid spacing and proves actual blockstun, not merely unchanged health after a miss. Crouching guard likewise blocks. Light/heavy/sweep/descending aerial light/aerial heavy deal7/14/10/8/12 damage once. Repeated ordinary enemy attacks reach zero HP and the actual prone KO. Victory is the documented neutral ready hold.

Five additional throw cases cover normal hit, mirrored hit, guard, jump miss and1P CPU play. Hits deal17, guarded throws deal1 chip, clean jump misses deal0; non-tied results finish normally. All cases have zero runtime errors. The ART-linked adapter is tested, not just a disconnected source preview.

The actual saved demo enables Batman/Flash selection. Native1P proof identifies the CPU opponent; native2P proof starts with both humans unlocked, keeps waiting after only P1 confirms, and requires independent P2 confirmation. Selected fighter IDs and combat labels match. The factory remains direct-combat by default for explicit test fixtures.

## Reproduction and admission

1. `python3 scripts/import-batman-fighter.py` creates the separate candidate and source proof, while asserting every old partial-pack file is unchanged.
2. `pnpm --filter @htn/harness exec node --import tsx ../../scripts/build-batman-fighter.mjs` prepares the source pack and actual `ART.get('dc-batman-atari-fighter/batman').character()` adapter. It refuses to overwrite an admitted source pack.
3. Run `node scripts/prove-batman-pixels.mjs`, `node scripts/prove-batman-coverage.mjs --adapter`, `node scripts/prove-batman-projectile.mjs`, and `node scripts/prove-batman-selection.mjs` offline.
4. `pnpm --filter @htn/harness exec node --import tsx ../../scripts/check-batman-fighter.mjs` binds current source, base controller, adapter, demo, screenshot and evidence hashes to admission. Changed artifacts fail the checks.

Source/crop contacts: `data/reference-cache/spriters-resource/dc-arcade/batman-fighter/contact.png` and `throw-contact.png`. Source actor and quality: `data/local-assets/dc-batman-atari-fighter/`. Actual demo/screenshots: `data/local-catalog/batman-atari-fighter-reference/`, particularly `evidence/projectile/hit-emission.png`, `hit-travel.png`, `evidence/coverage/p1-heavy-heavy-active.png`, `p1-ko-ko-held.png`, and `evidence/selection/2p-unlocked.png`.

The private demo matches only its exact title phrases, “Batman Atari Rooftop Duel” or “Atari Rooftop Duel.” General Batman requests do not force this genre. Read-only retrieval verified that “Street Fighter with Batman” selects the new compatible source actor, while “Batman platformer” retains the earlier partial movement actor. The new side-view actor is excluded from a top-down maze request.

Commercial source/derived pixels remain in ignored private data/. No source files, public assets or shared fighter controller were modified. No paid model/image API, generation UI or network request was used.
