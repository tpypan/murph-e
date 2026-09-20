# htn-2026: the talking arcade cabinet

A Mac mini in an arcade cabinet. You hold the mic button, say a game, watch
it get written on the screen, and play it on the joystick about a minute
later. Then the next person in line does the same.

Hack the North 2026.

- `docs/overview.md`: background, what we are building, decisions so far.
- `docs/goals/`: what tier 1, 2 and 3 look like when done.
- `docs/plans/tier-1.md`: the implementation plan for tier 1.
- `docs/harness-plan.md`: the generation pipeline design and its latency budget.
- `docs/badge-integration.md`: hacker badges as controllers and identity.
- `AGENTS.md`: conventions for anyone, human or agent, working in this repo.

## Run locally

Use Node 24+, pnpm 11, and Python 3.9+:

```sh
pnpm install --frozen-lockfile
pnpm stt:setup
pnpm dev
```

`stt:setup` creates `.venv-stt` and downloads faster-whisper's `tiny.en` English
model into `.models/whisper-tiny.en`. Transcription then runs offline on CPU
with int8 computation, using a persistent worker started on the first recording.
Hold SPACE/TALK, release, review the transcript, and select CREATE GAME.
The microphone is off between recordings. No typing fallback or cloud STT.

People using the cabinet generate games through the OpenAI API, using
`OPENAI_API_KEY` in the repo's gitignored `.env`. Assistant development, base-game
authoring, iteration and testing use the user's **Codex subscription (Astra medium)**
and offline tools. Developer CLI model calls are blocked, even with a saved key.
Only the cabinet's generation route opens the app request scope. Do not use that
route to bypass the developer restriction. See [the billing rule](AGENTS.md).
Local speech recognition and existing games work without an API key.

## Local game library

The home menu includes 13 original, tested arcade foundations: fighting, kart
racing, momentum platforming, maze chase, barrel climbing, Pong, Breakout,
formation shooting, Asteroids-style shooting, missile defense, road/river
crossing, bomb arenas and falling blocks. Each supports one and two players.
Browse with the controls or swipe; the gameplay preview stays separate from the
real game, which waits for PLAY. New and revised local packs refresh in the menu.

Generation retrieves relevant verified factory contracts and compatible sprite
sets, then links their code and animation data into the model's customization.
The [catalog guide](library/catalog/README.md) explains admission and reuse.
The shared [sound bank](docs/sound-effects.md) supplies event cues and custom tones.

SQLite stores the local index and quarantined generation history. Rebuild the
index with `pnpm harness catalog index`; inspect its
[schema](docs/reference/catalog-schema.sql) and the
[inventory/audio audit](docs/catalog-and-audio-audit.md).
`node scripts/catalog-snapshot.mjs` exports a read-only snapshot once indexed.

Six additional source-art adaptations are installed in this machine's ignored
`data/local-catalog/`. Their downloaded commercial sprites, the SQLite database,
generation run files, local speech models and secrets are not included in Git.
A fresh checkout runs the 13 original foundations without those private assets;
the import/build/proof scripts preserve the local adaptation workflow.

## Generation models and context

In the app, game writing and repair use `gpt-6-astra` at medium reasoning effort.
The historical CLI-only remix path is blocked for developer use.
The short structured spec uses `gpt-5.6-luna`. Both stages receive local
[arcade design guidance](docs/research/arcade-context/README.md): a shared core
and up to four relevant mechanic cards, with no extra model call or search service.
Every attempt saves its selected cards, source URLs and prompt text in `runs/`.
Set `HTN_DESIGN_CONTEXT=0` and restart to compare without that guidance.
See [the benchmark report](docs/bench-2026-09-19-astra-medium.md) for measured results.

Targeted [implementation references](library/reference/README.md) supplement the
design cards for maze chase and combat requests. The planner gets the structural
contract; build and repair also get original, tested code and available pixel sprite
data. Set `HTN_REFERENCE_CONTEXT=0` to compare without this layer. This does not
fetch external sprites or introduce a new runtime API.
