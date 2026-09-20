# Murph-e community arcade

An independent Next.js website for the public gallery and global leaderboard. It does not import the cabinet, model clients, serial drivers, game source, or badge IDs.

## Visual style

Matches the cabinet: pure black, locally served Press Start 2P, white text, cyan headings and yellow selections. The gallery and leaderboard use plain layouts without decorative panels or promotional sections.

## Run locally

From the repo root, install with `pnpm install`, then run `pnpm --filter @htn/web dev`.
The website opens on http://localhost:3020.

Copy `.env.example` to `.env.local` in this folder and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use the same Supabase project as the cabinet. Only the publishable key belongs in this app. Public RLS policies allow reading the safe gallery and score tables; all writes and private badge/code records are denied.

## Deploy on Vercel

1. Import this Git repository as a **new Vercel project**.
2. Set **Root Directory** to `apps/web` and Framework Preset to **Next.js**.
3. Keep the workspace available outside the root directory. Vercel installs the root pnpm workspace and uses this app's `build` script.
4. Add the two environment variables above to the project's Preview and Production environments.
5. Add `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pnpm version pinned by the repository.
6. Deploy. The app has no model API key, cabinet hardware dependency, or writable local database.

The CLI alternative is `vercel login`, then link a new project with root directory `apps/web` and deploy it. Do not link this app to an existing cabinet project.

Official monorepo setup: https://vercel.com/docs/monorepos

## Data and ranking

- `/` — paginated games, actual PNG thumbnails, creator names, search, generated-game filter.
- `/games/[slug]` — game details and its best scores.
- `/leaderboard` — best score per player, game and 1P/2P mode. Ties use earliest achievement, then stable ID. Filters cover all games, mode and player name. Raw scores are not normalized between different games.
- Pages refresh from Supabase every 30 seconds while visible. Empty and unavailable states do not substitute fabricated games or scores.
- A known badge gets one opaque player UUID. Badge IDs are in the private mapping table. Separate guest runs remain separate because there is no reliable guest identity.

See `docs/plans/community-arcade.md` for cabinet writes, retries, migrations and verification.
