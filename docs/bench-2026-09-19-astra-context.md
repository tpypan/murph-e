# Astra and local arcade context — 2026-09-19

Build, repair and remix now use `gpt-6-astra` at `low`, as requested. The
structured specification still uses `gpt-5.6-luna` at `none`. The Responses API
and streamed output remain in place. There is no new autonomous agent or model
call: the existing spec call selects design-card IDs, then the builder receives
the shared core and up to four relevant local cards.

The integration covers specification, building, repair and remix. It also
replaces unbounded difficulty instructions with explicit limits and recovery
phases, preserves requested signature mechanics over template conventions, and
allows larger character sprites for readable silhouettes. The engine/API and
the cabinet's explicit START behavior are unchanged by this integration.

## Measurements

| Run | Spec + one build p50 | p95 | Result |
| --- | ---: | ---: | --- |
| Historical Sol none, 1P | 26.2 s | 31.1 s | 20/20 old probe |
| Historical Astra low, 1P | 32.8 s | 38.5 s | 18/20 old probe |
| Astra low + context, 1P | 44.8 s | 57.6 s | 20/20 corrected probe; 19/20 original probe |
| Historical Sol none, 2P | 29.5 s | 35.0 s | 11/12 old probe |
| Astra low + context, 2P completed outputs, including retries | 51.5 s | 81.2 s | 12/12 corrected probe; three initial transport errors |

These build timings exclude STT, transcript-review time, the probe, repairs,
and cabinet delivery. They measure a single builder, not the cabinet's default
two-candidate race. One 1P request took 124.0 s; it remains in the result, not
discarded as an outlier. These small samples do not establish a latency SLA.

The initial two-player batch completed nine games; three streaming requests
stalled and ended with `terminated` transport errors. Its wall time was 1,117.4 s.
The three failed prompts were retried separately and all passed. The combined
row reports completed request latencies only; it does **not** include time spent
in those failed attempts, and is not a clean one-pass benchmark.

After the stalls, full-response deadlines were added: spec 30 s, build/repair
120 s, remix 60 s. They cover consumption of streamed output and cancel the
transport. The retry, focused and remix runs use these limits. They are not an
overall pipeline deadline or an execution watchdog for generated JavaScript.

Raw results:

- [1P generation](../bench/results/2026-09-19-1815-astra-low-design-context.md) and
  [recheck of the same outputs](../bench/results/2026-09-19-1815-astra-low-design-context-input-validation.json).
- [2P initial batch](../bench/results/2026-09-19-1834-astra-low-design-context-2p.md) and
  [three transport-error retries](../bench/results/2026-09-19-1837-astra-context-2p-network-retry.md).
- Historical [Sol 1P](../bench/results/2026-09-19-0859-gpt-5.6-sol-none.md),
  [Astra 1P](../bench/results/2026-09-19-0704-astra-low-rules2.md), and
  [Sol 2P](../bench/results/2026-09-19-0905-gpt-5.6-sol-none-2p.md).

The [four focused requests](../bench/results/2026-09-19-1838-astra-context-mechanics.md)
all passed the corrected probe (p50 53.6 s, p95 61.4 s). Selected cards matched
swing/grapple, grid movement plus enemy roles, projectiles plus pacing, and
platforming plus reference identity respectively. Code inspection confirmed
rope attachment, tangential release velocity and re-catching in the swinging
example. Its spec/code use rescue checkpoints with no terminal game-over;
this illustrates why a basic probe pass is not a complete arcade-round check.
The Batman output has a cowl/cape/belt sprite and rooftop/gadget mechanics;
no reference image was retrieved or character-fidelity approval performed.

The [remix benchmark](../bench/results/2026-09-19-1842-astra-context-remix-format.md)
completed all 12 cases: ten requested edits passed as remixes, and two new
premises correctly took the new-game path. No original-game fallback was needed.
Across all 12, p50 was 25.6 s and p95 51.5 s; median retained lines across the
ten remixes was 96%. Historical Sol measured 6.7 s p50 across the same job list.
The ten remixes alone had a 24.6 s median. The all-job median exceeds the repository's target of half the 1P generation median
(22.4 s); keeping Astra is a user-requested latency tradeoff, not a speed win.

The first remix batch exposed a system/user output-format conflict: Astra
returned full game files instead of patches, triggering slow repair calls.
That batch was stopped, its [initial attempt records](../bench/results/2026-09-19-1838-astra-context-remix-format-regression.json)
were retained, and the system prompt now explicitly replaces the full-file
contract during remix. The results above are the fresh run after that fix.

The [live cabinet request](../bench/results/2026-09-19-astra-context-cabinet.json)
completed through `/api/generate` with one builder in 60.0 s, source `build`,
without repair or library fallback. Its run log confirms Astra/low for build,
repair and remix, Luna/none for spec, and the expected enabled context cards.
The probe recorded a nonfatal B warning: the generated grapnel is conditional
on being airborne, while its B-only trial is grounded. That action was checked
in code, not validated in every eligible state. This test created a saved demo;
it did not start or replace the game displayed in the browser.

## What the checks establish

- The corrected probe rejects input-triggered crashes, including optional B
  and player-two inputs. It also checks conditional steering by comparing
  A+direction against A alone. The generated CAT DASH passed after this
  correction: its steering is deliberately available only in the air.
- All 44 existing library games and 10 templates pass. All 10 known-bad fixtures
  fail, including new A/direction-crash fixtures. Five focused browser regression
  tests pass. These library checks preceded the later live cabinet smoke test.
- Twenty harness tests pass: context selection and wiring, legacy specs,
  provenance, bounds, cancellation/deadlines, and existing score tests.
  Harness, probe and cabinet type checks pass; changed code passes Biome.
- In the 1P batch, core plus selected cards occupied 6,367–6,629 characters,
  within the 9,000-character cap. Nineteen of twenty builder responses reported
  5,609 cached input tokens. This demonstrates prompt-prefix reuse, not a cache
  of finished games. Exact selections and source URLs are saved per run.

The user requested both the context integration and model change. Historical
comparisons also differ in prompts and verifier behavior; they cannot isolate
the quality or latency effect of adding context. Astra remains configured
despite the measured latency increase because it was explicitly requested.

## Limits

Passing the probe means basic load/draw/survival/input checks passed. It does
not prove that scoring opportunities are reachable, all layouts are fair, the
character is recognizable, or the game is enjoyable. Thumbnail inspection is
not a CRT playtest.

Live reference/image lookup, approved sprite assets, reusable tested mechanic
components, richer acceptance scenarios, an overall pipeline deadline and a
killable execution watchdog remain future work. Named-character guidance is
currently text supplied to a tool-free builder; it must not be described as
having looked up artwork or verified visual fidelity.
