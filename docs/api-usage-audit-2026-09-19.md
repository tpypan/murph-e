# Saved API usage audit — 2026-09-19

The saved project artifacts account for **at least 4,093,047 API tokens** across 560 recorded calls. This is an offline artifact audit, not an account billing statement, and cannot establish how much one particular assistant task consumed.

| Scope | Input, lower bound | Cached input (included) | Output | Recorded reasoning (included in output) | Total, lower bound |
|---|---:|---:|---:|---:|---:|
| All saved usage | 2,709,510 | 1,844,741 | 1,383,537 | 124,966 | 4,093,047 |
| Benchmark-linked usage | 2,258,312 | 1,570,509 | 1,272,980 | 121,191 | 3,531,292 |
| Explicit Astra model | 1,118,237 | 664,624 | 866,631 | 105,126 | 1,984,868 |
| Explicit Sol model | 494,923 | 494,923 | 284,416 | 15,835 | 779,339 |
| Model unrecorded | 1,096,350 | 685,194 | 232,490 | 4,005 | 1,328,840 |

Benchmark-linked usage is a subset of all saved usage. Model rows partition all saved usage. They must not be added to the scope rows. Benchmark linkage means a run ID appears in a saved benchmark report; it establishes testing provenance, not the identity of whoever started the benchmark. Other app runs may have been started by assistants or humans. The artifacts do not reliably distinguish them.

## Reproduce

Run from the repository root:

```sh
python3 scripts/audit-api-usage.py --output docs/api-usage-audit-2026-09-19.json
```

The script uses only Python's standard library and local saved JSON. It makes no network or model calls and reads no credentials. The JSON preserves artifact paths, run IDs, timings, model labels and usage fields, without copying prompts or generated games.

## Evidence and deduplication

- Read 238 `runs/*/events.jsonl` files: 437 usage records, containing 2,124,869 input and 1,053,492 output tokens. Eleven event files have no usage records; none have malformed JSON lines.
- Read 53 `bench/results/*.json` files, containing 492 rows. Only build rows with a run ID and numeric token count contribute additional usage. A call key is `(runId, output, cached, reasoning, buildMs)`, yielding 292 distinct benchmark build records.
- Reconcile each benchmark build with an event of the same run ID, stage, elapsed build time and recorded output/cache/reasoning fields. There are 169 matches and 123 additional older builds. The additions contain 330,045 output and 584,641 cached input tokens, but omit full input counts.
- Exclude all 167 `timings.json` files from summation after verifying their build output is present in event evidence. Exclude three nested benchmark usage records after verifying they duplicate run-event usage.
- Preserve separate event usage lines. An independent check found no byte-equivalent parsed usage events duplicated across the logs.
- Benchmark-linked totals include every usage event whose run ID appears in a benchmark row, including three remix-regression runs, plus the 123 benchmark-only builds. There are 293 referenced run IDs and 467 usage records in this subset.
- Do not deduplicate solely by run ID: the two IDs ending `2109-street-fighter-but-with-batman-a` and `2109-a-kart-racing-game-around-a-coas` each represent separate one-player and two-player calls. Both calls survive in the shared event logs. Their respective output counts are 322/349 and 2,771/1,837. The JSON contains the exact paths and usage evidence.

## Token semantics and limits

`packages/harness/src/build.ts` assigns `usage.input` from API `input_tokens`, `cached` from `input_tokens_details.cached_tokens`, `output` from `output_tokens`, and `reasoning` from `output_tokens_details.reasoning_tokens`. `spec.ts` uses the same input/output/cache mapping. `bench.ts` stores `r.tokens.build` as row `tokens`; `gen.ts` obtains that value from build output usage. Cached input and reasoning are subsets, not extra tokens.

For the 123 benchmark-only builds, the input lower bound uses their known cached input. It does not pretend their omitted uncached input was zero. Those records comprise 103 Sol builds and 20 Astra builds. Unknown-model events remain unknown; present-day defaults are not proof of historical model selection. Spec events do not record reasoning separately, so the reasoning column is only the recorded subset.

Cancelled, failed or timed-out API requests may have incurred usage without saving a final usage record. Deleted runs and spec calls belonging to older benchmark-only builds can also be missing. No reliable total for those omissions, account charges, or subscription-backed development tokens can be inferred from these artifacts. Actual API billing usage can therefore be higher. No prices or dollar estimate are asserted.
