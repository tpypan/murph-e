Status: runtime palettes and composite frame layers are implemented. The current private Spider-Man draft contains 84 frames, including authored reaction and web-effect revisions; all 168 both-facing native comparisons have zero pixel mismatches. Fighter 1.2 also implements emitter sockets, travel/impact art and finite grounded binding with actual-input native proof. Original game timing/state fidelity, full move review and native-size staging remain separate work. See `../research/spider-man-web-review.md`.

# Preserve imported sprite colors without replacing the runtime

Status: runtime implementation verified on 2026-09-19; see `../runtime-palette-validation.md`. This document records the chosen design. Imported art, adapters, UI previews and model benchmarks have separate validation.

Add an optional, immutable palette to `api.spr`. Keep the existing pixel-row format, default PICO-8 colors, primitive API, 256×224 resolution and standalone `game.js`. Internally widen the indexed framebuffer to hold either a legacy index or an exact RGB color token. This is smaller and less error-prone than adding a second color layer that every primitive must erase, or maintaining palette-bank registrations whose order could affect probe hashes.

## Why this addresses the observed loss

The inspected Spider-Man idle and punch cells each contain **15 opaque source colors**. Several distinct blue shades currently become the same fixed PICO blue. A sprite-specific palette preserves those shades; increasing the number of pixels is not required to fix that particular loss. Source PNG index 0 is transparent black, index 1 is magenta sheet backing, and index 20 is opaque black: transparency must remain separate from RGB identity.

The sheet itself has orange highlights. Palette support preserves that actual source palette; it does not establish a canonical costume or authorize an undocumented red recolor. One inspected web-effect cell contains 20 opaque colors, so it does not fit the proposed first-version 16-color sprite contract. A later import can split it into independently paletted layers, preserving registration and draw order, or explicitly declare lossy conversion. Never silently truncate it.

Color preservation and spatial resolution are separate decisions. The existing private prototype scales source art by 9/16 to fit its present arena. Native source poses can be roughly 110×96, with some jumps 139 pixels tall and punches 152 pixels wide. Full-resolution art is not a drop-in fit for the current two-fighter composition, HUD and collision geometry. This change should initially compare the **same scaled pixel locations** before/after palette conversion; native-size staging needs its own composition and collision review.

## Public contract

```js
// Define once. Each nontransparent pixel still occupies one hex character.
const HERO_PALETTE = ['#000000', '#0033ee', '#0066ff', '#0088ff'];
const HERO = ['.12.', '0230'];
api.spr(HERO, x, y, false, false, HERO_PALETTE);

// All existing calls retain their exact rendering and return behavior.
api.spr(HERO, x, y);
```

- Sixth argument: optional `readonly string[]`, 1–16 complete `#RRGGBB` entries. A missing/undefined palette means the existing global palette. Keep `col()` and all primitive color arguments unchanged.
- `.` stays transparent; palette slot 0 is an ordinary opaque color. Sixteen opaque colors are available because transparency does not consume a slot.
- Validate once per palette identity, snapshot it, and cache its packed colors in a `WeakMap`. Like cached pixel arrays, palettes are immutable after first use. Define them once outside `draw`; do not make an unbounded content-keyed cache.
- Invalid palette strings, excessive entries or pixel indices outside a supplied palette fail clearly through the existing runtime error guard. No implicit nearest-color fallback on the rendering path.
- Keep geometry caching (`Screen.parsed`) keyed by the existing sprite string/array. Select colors separately per draw; the same pixel array can legitimately use two palettes. Do not cache a colored sprite using only its pixel-array identity.
- All colors and pixels remain in the bundled JavaScript. No external image loading, network calls, dependency, or extra generation call is needed.

## Framebuffer and readback semantics

`Screen.fb` currently is a `Uint8Array` of indices, and every primitive writes directly into it. Change it to `Uint32Array` with these canonical tokens:

| Token | Meaning |
|---|---|
| `0..15` | Existing PICO index, unchanged |
| `0x01000000 | 0xRRGGBB` | An opaque custom RGB color |

When a supplied RGB exactly matches a PICO entry, normalize it to that legacy index. Otherwise use the tagged RGB token. A custom black pixel therefore becomes opaque token 0, whereas a transparent sprite pixel makes **no write**. Different palette slots with the same RGB normalize to the same token. No palette-bank IDs or mutable global palette exist.

This adds 168 KiB per screen (56 KiB → 224 KiB at 256×224). It leaves the numerous primitive assignments and `fill()` calls correct without a sidecar or an extra clear operation. Ordered composition works naturally: a later primitive, HUD glyph, sprite, `cls`, or flash replaces the pixel token; a transparent sprite pixel preserves the existing token. Screen shake continues to offset the final image only.

`Screen.blit(target)` resolves legacy tokens through `PALETTE_ABGR` and tagged tokens to opaque packed RGBA. Make it the **only** framebuffer-to-RGBA conversion path used by the runtime, probe snapshot and DRAFT worker.

`pget(x,y)` should retain its existing 0–15 contract: legacy pixels return their index; custom pixels return the nearest PICO index using squared RGB distance, lower index breaking ties. A direct comparison with the 16 fixed colors keeps this readback independent of palette-cache lifetime. Document that this is a compatibility approximation for custom art, not an exact color readback or collision mask. `pset(x,y,pget(...))` remains exact for legacy games but is explicitly lossy for custom colors. An exact RGB readback API is unnecessary for this initial feature.

`Screen.hash(fromRow)` must include visible custom RGB, not only the local sprite index. Preserve existing hashes for all-legacy frames by retaining the current single-byte FNV-1a update for tokens 0–15. For a custom token, feed an escape byte `255`, then R, G and B bytes in that fixed order. This encoding cannot be confused with a legacy index stream and does not depend on palette identity or registration order. `Runtime.frameHash()` still excludes the top 12 HUD rows. This remains the same non-cryptographic motion/determinism check, not a collision-proof content digest.

`Screen.stats()` counts canonical visible tokens in a `Map`, rather than a fixed 16-entry array. `colors` and `dominantShare` reflect the displayed colors; `dominant` remains numeric and is the winning canonical token (legacy frames still return 0–15). Use the lowest token to break ties. The probe only consumes `colors` and `dominantShare` for its drawing check; its exercise script logs `dominant`. Document that extension without altering the pass threshold.

## Concrete change map

| File / function | Change |
|---|---|
| `packages/runtime/src/palette.ts` | Keep `PALETTE_HEX`, `PALETTE_ABGR` and `col` untouched. Add bounded palette validation, RGB-token packing/resolution and nearest-PICO helpers. |
| `packages/runtime/src/gfx.ts` — `Screen.fb`, `spr`, `hash`, `stats`, `blit`, `pget` | Apply token design above. Add a palette cache; retain current clipping/flips, `parseSprite`, geometry cache and transparent sentinel. Record the maximum used local index in parsed geometry to reject out-of-range palettes without rescanning each draw. |
| `packages/runtime/src/runtime.ts` — `makeApi().spr` | Forward the optional sixth argument. Existing `present()`, flash, HUD, reset and `frameHash()` continue through `Screen`. |
| `packages/runtime/src/build-preview-worker.ts` — `tick` | Replace direct `screen.fb` → `PALETTE_ABGR` iteration with `runtime.screen.blit(packed)`. Remove its palette import. Worker isolation, heartbeat, timeout, motion preference and reset remain intact. |
| `packages/runtime/src/index.ts` — probe hooks | `snapshot` already uses `blit`; preserve that path. Document custom `dominant` tokens in the hook type comments and matching `packages/probe/src/global.d.ts`. |
| `library/catalog/fighter/core.js` — `drawSprite` | Forward `frame.palette` as the sixth argument, supplying explicit `false` for flipY. `animationFrame` already spreads frame metadata, so a frame palette survives selection. Keep anchors, timing, collision and facing unchanged. Regenerate `module.js` with the existing build script and rebind affected catalogue quality hashes after validation. |
| `packages/harness/src/sprite-catalog.ts` — `frameSchema`, `normalizeSpriteSet` | Add explicitly validated optional `palette` to each frame; verify every nontransparent index exists. Current passthrough would retain an unknown property but is insufficient validation. Include it in saved/indexed content hashes as part of the frame data. |
| `packages/harness/src/sprite-link.ts` — `ART_RUNTIME.frame/draw` | Preserve `source.palette` in the cached frame and pass it through `api.spr`. `linkSpriteAssets` already embeds complete frame objects. Update the returned-frame contract text. |
| `scripts/import-spider-reference.py` | Add an exact-palette mode that compacts each frame's used opaque source indices to hex slots plus a palette; retain source-index mapping and alpha provenance. Keep existing quantized mode for explicit comparison. Reject >16-color cells or produce documented layers in a later task. Keep all commercial pixels in the ignored private cache. |
| `packages/runtime/API.md`, `packages/harness/src/prompt.ts` | Document the optional palette and `pget` approximation; replace the house rule that requires all art to use fixed RGB values. `buildPrompt` reads this API file directly. Review every legacy template against the extended contract; add an inline-palette example without reskinning established templates. Follow the repository's API/reference/template/bench requirement when implementing. |

The literal sprite fallback is another palette consumer: `apps/cabinet/app/build-console.tsx:SpritePreview` currently reads `PALETTE_HEX` directly. Extend `DraftSprite` in `build-preview.ts` with an optional validated palette and have `SpritePreview` use it. Keep parsing non-executing and deliberately narrow: support a complete literal `NAME_PALETTE` declaration **before** the existing `NAME` pixel array. This is an authoring convention for early row previews, not a restriction on the runtime. Incomplete or invalid palette declarations suppress that sprite preview until valid; never render known custom indices as PICO colors. Do not try to evaluate arbitrary sixth-argument expressions in the UI. Bundled ART/fighter data and other custom constructions can appear through the isolated full-scene worker once valid, with its last successful frame retained while code is incomplete.

Rebuild `packages/runtime/runtime.js` and `build-preview.html`, then run the cabinet's `sync-runtime`; the app serves copies under `apps/cabinet/public/runtime/`. Editing only the TypeScript without syncing would leave the user watching the old renderer. Update the display wording in `docs/overview.md` and `docs/design-guide.md` to say a default 16-color palette plus per-sprite palettes, without changing their layout or spatial-resolution rules.

## Verification before enabling imported art

1. **Legacy equality:** capture fixed-seed framebuffer hashes and PNG bytes for current templates and selected catalogue games before the change. Repeat after it: no-input, scripted-input, HUD, title, game-over, flash and reset should match exactly. Run `pnpm exercise`, the existing harness/probe suites, and 1P/2P catalogue regression probes.
2. **Exact source colors:** import the same scaled Spider-Man idle/punch pixels in both modes. Assert every opaque custom-palette rendered pixel equals the retained source RGB at that location, all 15 shades survive, index-20 black is opaque, and removed backing/transparent pixels expose the background. Render real native screenshots beside the quantized baseline; do not substitute a mockup.
3. **Composition:** overlap custom sprites with different palettes and a PICO sprite, then draw every primitive/text path over them. Test all flips, clipping at every edge, transparent holes, `cls`, flash, HUD and reset. No old custom color may survive an opaque overwrite.
4. **Cache and probe correctness:** draw the same rows with two palettes; swapping only visible RGB must change the hash. Equivalent RGB via different palette identities/slots must give identical hashes and snapshots. Invisible/fully covered palette changes must not affect the hash. Verify actual visible-color stats, stable `pget` projection, legacy out-of-bounds behavior and repeated-reset determinism.
5. **DRAFT parity:** compare worker RGBA with the native probe snapshot for the same code/seed/frame. Test the early literal convention, partial/invalid palette metadata, opaque black and transparency; retain existing worker-timeout, cancellation, reduced-motion and no-autoplay checks in `build-ui-test.mjs`.
6. **Limits and latency:** malformed palettes and unavailable indices fail cleanly; 20-color source cells are reported honestly. Keep dimensions and frame timings identical for the palette comparison. Measure draw/hash cost and run the prompt bench once when the contract changes. No new model call or external asset request belongs in this path.

The initial deliverable is better preservation of already-authored pixels. It does not recover original move timing, make proxy hurt/KO clips authentic, add a web projectile hook, resolve licensing, or solve arena composition. Those remain separate, visible limitations of the private import proof.
