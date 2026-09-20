# Optional sprite palette runtime verification

Implemented on 2026-09-19 against the design in `plans/sprite-palette-support.md`.
`api.spr` now accepts an optional sixth argument containing 1–16 complete RGB hex
colors. Legacy calls and primitive colors retain their behavior. The widened
framebuffer stores canonical visible RGB tokens, so draw order, exact snapshots,
hashes and color counts do not depend on palette registration order. `pget` retains
its 0–15 contract with an explicitly documented nearest-PICO approximation for
custom pixels. Palette identities are cached weakly as immutable snapshots.

Validation completed:

- Eight focused test suites passed: default palette/hash identity; fifteen exact
  custom colors with opaque black and transparent holes; independent geometry and
  palette caches; all primitive/text/default-sprite overwrite paths; both flips
  and four-edge clipping; visible RGB hashes/stats and nearest-color tie breaking;
  palette/index rejection; and runtime error, HUD, flash and reset handling.
- Before changing the renderer, captured native framebuffer hashes, PNG-byte
  hashes, color statistics and states for all ten existing JavaScript templates,
  both player counts of all twelve foundations, and a flash/primitive protocol
  fixture. All **245 snapshots across 35 configurations matched exactly** after
  the renderer change and the concurrent default fighter/climber adapter rebuilds.
- The actual worker embedded in `build-preview.html` produced byte-identical RGBA
  to the native probe for both player counts. All fifteen test colors remained
  exact; the composed scene had 22 visible colors. Invalid palette indices caused
  the worker to report unavailable through its existing error path.
- `pnpm exercise` passed all **26 protocol checks**. Runtime typecheck and scoped
  Biome checks passed. Rebuilt `runtime.js` and `build-preview.html`, ran cabinet
  `sync-runtime`, and compared the served copies byte for byte.
- Opened both native color-comparison screenshots. Exact blue shades remain
  distinct; their explicit `pget` projection visibly collapses to fewer default
  shades. This is a synthetic renderer test, not an imported-art fidelity claim.

Reproducible commands:

```sh
# Capture before a renderer edit; compare after rebuilding it.
node packages/runtime/scripts/legacy-palette-snapshots.mjs capture
pnpm --filter @htn/runtime build
node packages/runtime/scripts/legacy-palette-snapshots.mjs compare

pnpm --filter @htn/harness exec node --import tsx --test ../runtime/scripts/palette.test.ts
node packages/runtime/scripts/palette-browser.mjs
pnpm exercise
pnpm --filter @htn/runtime typecheck
pnpm --filter @htn/cabinet sync-runtime
```

The snapshot script defaults to `/tmp/arcade-legacy-palette-baseline.json`; pass a
third argument for another baseline path. Browser comparisons and native PNGs are
written to `/tmp/arcade-palette-test/`. No source assets or game-pack hashes are
changed by these checks.

A warmed local Node microbenchmark of a full-screen sprite draw, framebuffer hash,
visible-color statistics and RGBA blit measured 1.10 ms median / 1.47 ms p95 for
legacy colors and 1.18 ms median / 1.23 ms p95 for custom colors across 200 samples.
This is a local operation-cost measurement, not a cabinet hardware or model-latency
benchmark. The framebuffer costs an additional 168 KiB per runtime instance.

Imported source-pixel fidelity, actor pose mapping, UI literal previews, model
prompts and generation benchmarks have their own validation. This renderer feature
preserves authored colors; it does not supply missing animation or collision data.
