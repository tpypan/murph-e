import type { Metadata } from 'next'
import { LiveRefresh } from '../../components/refresh'
import { Empty, Header, Pagination, ScoresTable } from '../../components/ui'
import { gameOptions, getLeaderboard, number } from '../../lib/data'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Leaderboard' }
export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; mode?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const results = await Promise.allSettled([
    getLeaderboard({ ...params, page: Number(params.page) }),
    gameOptions(),
  ])
  const data = results[0].status === 'fulfilled' ? results[0].value : null
  const games = results[1].status === 'fulfilled' ? results[1].value : []
  const href = `/leaderboard?${new URLSearchParams({ game: params.game || '', mode: params.mode || '', q: params.q || '' })}`
  return (
    <>
      <Header tab="leaderboard" />
      <main id="content" className="leaderboard-page">
        <h1>HIGH SCORES</h1>
        <p className="page-note">BEST PER PLAYER, GAME & MODE.</p>
        <section className="leaderboard-panel" aria-label="Global leaderboard">
          <form className="filters board-filters">
            <label className="search-input">
              <input
                name="q"
                aria-label="Find a player"
                defaultValue={params.q}
                placeholder="PLAYER NAME"
              />
            </label>
            <select name="game" aria-label="Filter by game" defaultValue={params.game || ''}>
              <option value="">ALL GAMES</option>
              {games.map((g) => (
                <option value={g.slug} key={g.slug}>
                  {g.title}
                </option>
              ))}
            </select>
            <select name="mode" aria-label="Filter by player mode" defaultValue={params.mode || ''}>
              <option value="">1P + 2P</option>
              <option value="1">1P</option>
              <option value="2">2P</option>
            </select>
            <button type="submit" className="filter-button">
              APPLY
            </button>
          </form>
          {!data ? (
            <Empty title="COULDN'T LOAD SCORES">PLEASE TRY AGAIN.</Empty>
          ) : data.scores.length ? (
            <ScoresTable scores={data.scores} offset={(data.page - 1) * 25} />
          ) : (
            <Empty title="NO SCORES YET">TRY ANOTHER FILTER OR FINISH A GAME AT THE CABINET.</Empty>
          )}
          {data && (
            <>
              <p className="board-note">
                {number(data.count)} PERSONAL BESTS. EACH GAME USES ITS OWN SCORING.
              </p>
              <Pagination page={data.page} count={data.count} size={25} href={href} />
            </>
          )}
        </section>
      </main>
      <LiveRefresh />
    </>
  )
}
