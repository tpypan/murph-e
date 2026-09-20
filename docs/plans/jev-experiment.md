# Jev + Astra experiment

Branch: `codex/jev-experiment`, based on local `main` at `e1d693b`.
Worktree: `/Users/shayaanazeem/Downloads/htncodex/htn-2026-jev`.

## Behavior

The cabinet transcribes speech with OpenAI `gpt-4o-mini-transcribe` and uses Luna to create its detailed
game specification. With `HTN_JEV=1`, the harness then makes one TypeSafe request
to select a compatible verified game foundation and optional settings. Astra
still writes new JavaScript, including custom mechanics and art. Its two-build
race, catalog linker, runtime probe and bounded repair path remain in place.

Jev uses `POST https://api.typesafe.ai/v1/systemone`, pinned by default to
`jev-1.13.0`. It returns typed choices, not code. Foundation selection uses the
catalog's actual contracts; drafts, unsupported player counts, explicit
exclusions and conflicting core mechanics cannot be selected. Jev can recover
a semantic match even when the deterministic keyword rank is zero.

Optional presets currently cover formation-shooter difficulty/lives/bunkers,
crossing speed/turtles, and fighter CPU difficulty. Independent preset questions
share the selection request. Only the chosen foundation's answer is consumed;
other requested settings and novel gameplay remain Astra's responsibility.
The original request takes precedence over all advice. Player count remains
the cabinet's explicit choice. Moderated original text is not sent to Jev.

`no_match` and low-confidence choices give Astra the normal runtime API without
a complete foundation. A provisional confidence floor of 0.7 is an experimental
routing policy, not a measured quality guarantee. Low-confidence preset answers
leave configuration unspecified. No eligible candidates skips the Jev request.
Existing separately selected sprite assets and implementation references remain
available to Astra.

The new stage has a full-response 10-second deadline, cancellation support and
no automatic retries. Malformed responses and service failures stop generation
before Astra builds; the cabinet's existing terminal-error flow handles them.
Missing TypeSafe configuration fails before the Luna request. At most 254
foundations and 96,000 serialized request characters are accepted; oversized
catalogs fail explicitly rather than silently dropping contracts.

## Configuration

Create a gitignored `.env` in this worktree with the existing OpenAI app
configuration plus:

```dotenv
HTN_JEV=1
TYPESAFE_API_KEY=your-server-side-key
HTN_JEV_MODEL=jev-1.13.0
```

Both providers are required for the hybrid path. Do not change the original
checkout's `.env`. `HTN_JEV=0` (or absent) restores the original deterministic
catalog selection. `.env.example` opts into the experiment when copied.

Start a separate cabinet instance with:

```sh
HTN_BADGES=off pnpm --filter @htn/cabinet dev --port 3001
```

Then open `http://localhost:3001`. `HTN_BADGES=off` prevents the experiment
from competing with the original cabinet for badge hardware. Speech setup is
only needed for `HTN_STT_PROVIDER=local`; OpenAI transcription uses the existing
OpenAI key. See [speech configuration](speech-transcription.md). No paid model
requests were made by the assistant during implementation.

## Evidence and verification

Each successful routing stage saves `runs/<run>/jev-routing.json`, containing
the questions and state, actual returned model version, typed answers,
confidence, token usage, selected ID, configuration and elapsed milliseconds.
Factory hashes are in the request state; the existing catalog snapshot and
game artifacts retain the selected source provenance. Credentials are never
stored in these artifacts or sent to the browser. Provider error bodies are
not echoed.

The existing app-request spending guard also protects TypeSafe. Developer calls
reject before transport; a key is not permission to run paid assistant tests.
Tests use dummy keys and mocked transports only. No live Jev quality, cost, or
latency claim is established by these tests.

Offline checks:

```sh
pnpm --filter @htn/harness typecheck
pnpm test:scores
```

Coverage includes the Jev-to-Astra prompt and linking handoff, one selection
before the two-build race, no-match/uncertainty, invalid responses, cancellation,
deadline, player count, moderation, catalog exclusions, missing-key preflight,
spending policy, provider errors and the original pipeline/history regressions.

## Official references

- [TypeSafe skill](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)
- [System One capabilities](https://docs.typesafe.ai/concepts/system-one)
- [HTTP API](https://docs.typesafe.ai/api)
- [Choice guidance](https://docs.typesafe.ai/primitives/choice)
- [Models](https://docs.typesafe.ai/models)
- [Function selection cookbook](https://docs.typesafe.ai/cookbooks/function_calling)

The TypeSafe skill is installed for Codex at the parent workspace's
`.agents/skills/typesafe-ai/SKILL.md` and was used for this integration.
