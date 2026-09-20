import { LiveRefresh } from '../components/refresh'
import { Empty, GameCard, Header, Pagination } from '../components/ui'
import { getGames, number } from '../lib/data'
export const dynamic = 'force-dynamic'
export default async function Gallery({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>
}) {
  const params = await searchParams
  const data = await getGames({ ...params, page: Number(params.page) }).catch(() => null)
  const href = `/?${new URLSearchParams({ q: params.q || '', source: params.source || '' })}`
  return (
    <>
      <Header tab="games" />
      <main id="content" className="collection">
        <h1 className="sr-only">GAMES</h1>
        <form className="filters">
          <label className="search-input">
            <input
              aria-label="Search games or creators"
              name="q"
              defaultValue={params.q}
              placeholder="GAME OR CREATOR"
            />
          </label>
          <select name="source" aria-label="Game collection" defaultValue={params.source || ''}>
            <option value="">ALL GAMES</option>
            <option value="generated">NEWLY GENERATED</option>
          </select>
          <button type="submit" className="filter-button">
            FIND GAMES
          </button>
        </form>
        {data && <p className="result-count">{number(data.count)} GAMES</p>}
        {!data ? (
          <Empty title="COULDN'T LOAD GAMES">PLEASE TRY AGAIN.</Empty>
        ) : data.games.length ? (
          <div className="game-grid">
            {data.games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        ) : (
          <Empty title="NO GAMES FOUND">
            {params.q ? 'TRY ANOTHER GAME OR CREATOR.' : 'SAVED GAMES APPEAR HERE.'}
          </Empty>
        )}
        {data && <Pagination page={data.page} count={data.count} size={24} href={href} />}
      </main>
      <LiveRefresh />
    </>
  )
}
