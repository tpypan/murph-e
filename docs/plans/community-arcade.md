# Public gallery and global leaderboard

`apps/web` is a separate, Vercel-ready Next.js application. The cabinet stays a local application that owns the hardware and generation APIs. The public website has no endpoint that submits scores or generates games.

## Flow

1. A generated game passes both supported player-mode probes and is saved locally with the creator identity captured by the cabinet server. Full source, linked code, sprite metadata and creator identity stay in the private generated-game store.
2. The cabinet queues a public projection: title, stable slug, description, genre, creator name, supported modes and screenshot. The server uploads the screenshot to the `arcade-thumbnails` bucket and upserts `arcade_games`. The public app never reads code, transcripts or badge IDs.
3. Pressing PLAY creates a server-side play session. The server resolves the actual game and snapshots the badge identities for the chosen slots. The browser cannot supply a creator/player name or badge ID to this endpoint. One-player mode uses the first connected badge; two-player mode uses hub slots 0 and 1. Unplugging mid-round does not change the saved identity.
4. A runtime `gameover` or `win` event submits the session ID, both scores, outcome and winner. The browser retains a pending result until the cabinet acknowledges its durable local save. Returning online or the periodic retry resumes delivery.
5. The cabinet records the result and queues one cloud event per player. Each event is keyed by session and slot, so retries cannot add another score. A changed score for an already completed round is rejected. Each replay gets a new session.
6. A cabinet-only SQL transaction maps private badge identity to an opaque public player UUID and inserts the score. The gallery and leaderboard refresh automatically.

The publisher queues the full delivered artifact and public display metadata together after validation. Cloud retries never repeat generation or make model requests.

## Storage

- `arcade_games`: public display metadata; one record per stable game slug.
- `arcade_players`: opaque UUID, public display name, guest status, last played time.
- `arcade_player_identities`: private badge ID → public player UUID mapping.
- `arcade_scores`: immutable round results, player slot, 1P/2P mode, score, outcome, time.
- `arcade_leaderboard`: security-invoker view selecting the best result per player/game/mode.
- `arcade_stats`: security-invoker view with collection, player and result totals.
- `record_arcade_score`: security-invoker function, executable only by the service role. Identity creation and score insertion are atomic; same-event retries are idempotent.

All tables enable RLS. Only safe public tables/views grant anonymous SELECT. The website receives only the publishable key. `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) remains in the local cabinet environment. Gameplay scores are reported by the trusted cabinet runtime; this is not a remotely hosted anti-cheat game server.

Local recovery data lives in `data/arcade/sessions` and `data/arcade/outbox` as atomic, owner-readable files. Results also remain in `data/scores.json` for the cabinet's local leaderboard. A cloud failure keeps the queue intact; an acknowledgement removes only the exact uploaded item. Queue flushing runs every 30 seconds in the cabinet process and is also kicked by score reads/writes and generation completion. The server must be running to drain its outbox.

## Setup and backfill

Apply the committed Supabase migrations, preserving any already-applied migration history. The gallery migration creates the read-only projection, scores and thumbnail bucket. It does not change access to `generated_games` or the reuse registry.

From `packages/harness`:

```sh
node --import tsx ../../scripts/sync-arcade.ts /absolute/path/to/cabinet/repo
node --import tsx ../../scripts/flush-arcade.ts
```

An optional third script argument imports an existing `data/scores.json`. The importer matches known games, rejects invalid scores and explicit fake/test badge IDs, and uses stable legacy event IDs so re-running does not duplicate history. It leaves all original local records intact. Existing thumbnails are uploaded as-is; missing catalog/template thumbnails are captured by the offline runtime probe. No game generation/model requests occur.

For the original backfill: 102 games and 42 historical results were imported. Eighteen unmatched/test records were retained locally and excluded from the public leaderboard. All 102 games have actual thumbnails.

## Verification

- Harness: `node --import tsx --test test/arcade-store.test.ts test/score-delivery.test.ts test/scores.test.ts test/pipeline-history.test.ts`
- `supabase/verify-arcade.sql`: role checks, duplicate retries, conflicting writes, personal-best ranking and guest separation. Everything runs in a transaction that rolls back.
- Supabase security advisors: no findings after applying the migration.
- Website: `BASE=http://localhost:3020 node scripts/showcase-ui-test.mjs` from `packages/probe`.
- Cabinet lifecycle: `score-persistence-ui-test.mjs` against an isolated server with `HTN_BADGES=off`, `HTN_CLOUD_SYNC=off`, `HTN_ARCADE_DATA_DIR` and `HTN_SCORE_FILE` pointing to temporary test directories. It uses real sessions and local score persistence, exercises actual game-over events and simulates a failed HTTP delivery. Never point it at the shared hardware cabinet.
- `pnpm --filter @htn/web build` verifies the production website.

Historical local files are imported where available. Unrecorded past plays cannot be reconstructed.
