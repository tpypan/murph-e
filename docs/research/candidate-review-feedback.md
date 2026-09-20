# Turning archived candidates into quality feedback

This pass adds offline review and retrieval of findings. It is not RL, training,
automatic repair, or admission of generated games into the reusable library.
No model requests were made.

## What was missing

At inspection the real SQLite database held **63 quarantined code hashes and 64
run associations**. Its new per-attempt/history tables were empty: the saved games
predate the archival correction. There was no review table. The CLI listed code
hash/title/status, but could not expose each attempt's request/outcome or record a
semantic/visual judgment.

The missing distinction was already visible in frozen evidence:

| Exact candidate | Stored probe | Quality finding beyond the probe |
| --- | --- | --- |
| `e427d33e2ace8f78b6a485320e2fb70bee27751e0d6ad11468465dbe0ee8ff9b` — SECTOR BREAK | Pass | Wrapper adds an unrequested 10 points per large/medium split; preserved native route records 45 bonuses, or 450 extra points. |
| `bb02489bbb28b2377b712db438ef11789b28b26716f806a95a86a125c29cfc34` — FROGGER DUO | Pass | HOME notice is drawn over the time counter when the home callback fires. |
| `e53d493d23aeebbc90d1a5f397d4517421c84330abb34c9f065d9ceab4192a9c` — LINE RACE | Pass | Added x127/128 divider bisects the shared NEXT/TIME labels. |
| `b00e3041150d6bb131f75305f1180f96742c9c296aa6794b5e1e91a856665495` — FROG CROSS | Fail | A is advertised as an action, but merely sets an already-true hop request under the same directional condition. |

Source/spec/request files were inspected again. Both HUD screenshots were opened
at native resolution; the scoring route is preserved evidence rather than a new
runtime replay. Four `needs-work` reviews now bind these findings to the exact
code and evidence-file hashes. All four games remain quarantined and unchanged.
The database now has four review records; the historical lack of per-attempt
metadata is still explicitly reported rather than backfilled with guesses.

The [expanded audit](../bench-2026-09-19-catalog-expanded.md) and
[control failure trace](../bench-2026-09-19-palette-v44-observations.md) contain the
longer context. Fixes to current contracts do not retroactively repair these
frozen cartridges.

Identity needs a separate judgment too. The current retrieval regression rejects
incomplete or wrong-role named art and negated names; that is not evidence that
every generated adaptation has the right silhouette, poses or signature mechanic.
This pass adds an `identity` finding category and an attempt-scoped regression
fixture, but does **not** invent a newly observed identity failure in those four
frozen games. `inconclusive` is available for unsupported visual/balance claims.

## Commands

These commands are local and make no model calls:

```sh
pnpm harness catalog candidates --review-status unreviewed --limit 20
pnpm harness catalog candidates --query "frog"
pnpm harness catalog candidate bb02489b
pnpm harness catalog candidate <hash> --attempt <attempt-id> --include-output
pnpm harness catalog review <hash> --file review.json
pnpm harness catalog findings --category presentation --verdict needs-work
```

In restricted environments where the `tsx` CLI cannot create its IPC socket, the
same CLI can be run without that wrapper:

```sh
pnpm --filter @htn/harness exec node --import tsx src/cli.ts catalog candidates --review-status needs-work
```

`candidate` accepts a full SHA-256 or a unique prefix of at least eight hex
characters. It returns first-observed provenance, all run associations, per-attempt
metadata/outcomes/events, and review history. Model output/customization are hidden
by default and available with `--include-output`. Legacy run associations lacking
attempt metadata are named explicitly. A later same-code request is searchable
without replacing the first request's provenance.

`candidates` supports `--query`, `--review-status`, `--limit` (1–200) and
`--offset`. `findings` supports category, verdict and the same pagination. Current
findings use the latest review **within each code or attempt scope**. An acceptable
code-scoped review does not erase an unresolved attempt-scoped mismatch.

For isolated fixtures or another local archive, commands accept `--db PATH`;
writing a review also accepts `--storage PATH` (candidate directory root) and
`--evidence-root PATH`. Reads open SQLite read-only and do not create review tables
or an absent database. Saving a review creates only its review table/files.

## Review format

```json
{
  "schemaVersion": 1,
  "reviewer": { "kind": "codex", "name": "Local gameplay review" },
  "verdict": "needs-work",
  "summary": "The home notice hides the countdown.",
  "evidence": [
    {
      "path": "bench/results/catalog-expanded-medium-audit-a/crossing-2p-notice.png",
      "note": "Native screenshot at the first home callback."
    }
  ],
  "findings": [
    {
      "category": "presentation",
      "severity": "major",
      "expected": "The time counter remains visible during a home notice.",
      "observed": "HOME covers the time digits.",
      "evidence": [0],
      "recommendation": "Use the reserved notice slot and test its real callback."
    }
  ]
}
```

Optional `attemptId` must name a real attempt belonging to that code hash. Prefer
it for request-specific judgments when available. Reviewers are `human` or
`codex`; their name is attribution, not an authenticated signature. Verdicts are
`needs-work`, `acceptable`, or `inconclusive`. Categories are `rules`, `controls`,
`identity`, `presentation`, `animation`, `balance`, `terminal`, `sound`,
`performance`, and `other`; severities are `blocker`, `major`, `minor`, `note`.

Each finding includes an expectation, observation, references into the evidence
array, and optionally a recommendation. Evidence is a real local file within the
evidence root; its bytes and size are hashed at save. Source `game.js` must still
match the candidate SHA. Missing evidence, wrong attempt IDs, changed source,
symlink escapes and malformed records are rejected. `acceptable` cannot include
unresolved defects; `needs-work` needs an actionable finding. An inconclusive
review can record a limited observation without pretending to establish balance.

Reviews are immutable UUID-named JSON files under
`data/catalog/candidates/<hash>/reviews/`, mirrored in `candidate_reviews` with
their own SHA-256. A new review supersedes the previous review in the same scope
while preserving it in history. Stored evidence hashes describe the files at
review time; inspect their current bytes before reusing the finding as new proof.
Reviews never rewrite runtime validation or candidate status and never create
`quality.json` or a reusable asset/foundation.

## The useful improvement loop

1. Group actual findings by category, foundation/version and requested change.
2. Turn a specific failure into an offline regression: count score deltas, compare
   HUD pixels at the callback, exercise the claimed control, or inspect the exact
   named actor and its action states. Keep known-good controls alongside failures.
3. Correct the reusable code/contract or prompt rule, then run that regression.
4. Record a review for the new code hash. Preserve the old candidate and failed
   finding so an old problem cannot become invisible after a prompt edit.

Existing prompts already request faithful controls, identities, scoring and HUD
space. Repeating those general instructions is not a substitute for evidence at
the precise callback/state that failed. The archive now makes the findings
inspectable and queryable; it does not automatically infer or approve a reusable
lesson. A future lesson retriever should accept only explicitly curated, bounded,
source-linked rules with a regression, never inject raw review prose as trusted
instructions or treat a positive review as asset admission. That retriever is
outside this change.

## Verification

`packages/harness/test/candidate-review.test.ts` covers legacy gaps, complete
attempt inspection, output redaction, querying later same-code requests, immutable
revisions, separate scopes, inconclusive outcomes, exact file hashes, malformed
reviews, source tampering, evidence escape rejection and unchanged quarantine.
An actual CLI subprocess test executes list/inspect/save/findings commands against
an isolated database with a fetch tripwire. No paid API, live generation, source
game mutation or promotion is part of these tests.
