# Astra medium v4.4: source palettes and standard regression

The optional per-sprite RGB palette API, prompt contract and private catalog path
were checked with the standard 20 one-player and 12 two-player prompts. These are
single observations per prompt, with no repairs counted as first-pass successes.

| Suite | Passing / attempted | Probe failures | Request errors | Completed total p50 / p95 |
| --- | --- | --- | --- | --- |
| 1P | 18 / 20 | 1 | 1 | 168.8 s / 220.6 s |
| 2P | 11 / 12 | 1 | 0 | 187.2 s / 254.1 s |

There were no syntax errors among completed builds. Overall, 29 of 32 attempts
passed the short runtime/input probe. The one-player report's 18/19 probe rate
excludes the open-world crafting RPG that exceeded the 300-second build deadline;
18/20 is the end-to-end success count. Latency quantiles also exclude that timeout.

Raw results: [1P](../bench/results/2026-09-19-2235-palette-v44-medium-1p.md)
and [2P](../bench/results/2026-09-19-2233-palette-v44-medium-2p.md).

## Failures and limits

- Frog crossing missed the relevant catalog foundation. The generated game also
  declared an A action that had no distinct effect. This is retrieval and control
  fidelity work, independent of custom palettes.
- Tank combat authored two short sprite rows. Its unchecked rotation concatenated
  `undefined` into the pixels, and the strict palette guard rejected the corrupted
  result. The minimized broken case and repaired-row control are now browser
  regression tests. The frozen generated sample remains unchanged.
- The open-world crafting request timed out. Freeform generation remains too slow
  and unreliable for a consistently quick cabinet experience.

The [failure trace](bench-2026-09-19-palette-v44-observations.md) explains the first
two cases. A probe pass does not establish balanced play, original-game fidelity,
complete animation semantics, or physical CRT readability.

The earlier medium reference suites passed 13/20 in 1P and 7/12 in 2P, with seven
and five build deadlines respectively. Their completed-only total p50/p95 were
162.7/180.0 seconds and 162.9/177.1 seconds. Those runs had a shorter 180-second
deadline, different catalog context and output settings. They are historical
comparisons, not a controlled palette ablation: the current higher p95 includes
slow cases that the previous deadline censored. Do not attribute improved completion
or latency changes to RGB support alone.

## Named Donkey Kong integration

The reviewed private source-art pack was exercised separately:

- Actual 1P Astra request: 10.060 seconds, 134 output tokens, selected the correct
  local pack and passed the probe.
- Actual 2P cabinet HTTP request: 12.112 seconds total, 2.941-second build, 134
  output tokens. Source-art preview, streamed customization, probe and READY events
  completed successfully.
- Native 1P and 2P input routes each reached three rescues and the win state;
  reset returned scores to zero. These exercise the default local factory, not
  test-only asset overrides.

These are two individual latency observations. The source artwork is authentic;
stage layout, physics and cooperative rules remain our climber implementation.
See the [source/frame/admission audit](research/donkey-kong-sheet-audit.md).

## Deterministic verification

The [runtime verification](runtime-palette-validation.md) records 245 byte-identical
legacy snapshots, eight palette unit tests, 26 runtime checks and native/preview
pixel parity. The harness suite passed 65 tests and the browser probe suite passed
10 tests. Cabinet streaming/START gating and literal-palette preview checks passed.
No existing saved game was rewritten to make a benchmark pass.
