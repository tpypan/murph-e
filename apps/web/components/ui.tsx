import Link from 'next/link'
import { type Game, number, type Score } from '../lib/data'

export function Header({ tab }: { tab: 'games' | 'leaderboard' }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Arcade home">
        ARCADE
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/" aria-current={tab === 'games' ? 'page' : undefined}>
          <span aria-hidden>{tab === 'games' ? '> ' : '\u00a0\u00a0'}</span>GAMES
        </Link>
        <Link href="/leaderboard" aria-current={tab === 'leaderboard' ? 'page' : undefined}>
          <span aria-hidden>{tab === 'leaderboard' ? '> ' : '\u00a0\u00a0'}</span>LEADERBOARD
        </Link>
      </nav>
    </header>
  )
}
export function GameArt({
  game,
  priority = false,
}: {
  game: Pick<Game, 'title' | 'thumbnail_url'>
  priority?: boolean
}) {
  return game.thumbnail_url ? (
    // biome-ignore lint/performance/noImgElement: Preserve the original pixel screenshot without resampling.
    <img
      src={game.thumbnail_url}
      alt={`${game.title} gameplay`}
      loading={priority ? 'eager' : 'lazy'}
      className="game-art"
    />
  ) : (
    <div className="missing-art" role="img" aria-label={`${game.title}: preview coming soon`}>
      PREVIEW COMING SOON
    </div>
  )
}
export function GameCard({ game }: { game: Game }) {
  return (
    <Link className="game-card" href={`/games/${encodeURIComponent(game.slug)}`}>
      <div className="card-image">
        <GameArt game={game} />
      </div>
      <h2>{game.title}</h2>
      <p>BY {game.creator_name}</p>
    </Link>
  )
}
export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  )
}
export function Pagination({
  page,
  count,
  size,
  href,
}: {
  page: number
  count: number
  size: number
  href: string
}) {
  const pages = Math.max(1, Math.ceil(count / size))
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link href={`${href}&page=${page - 1}`}>PREV</Link> : <span />}
      <span>
        {number(page)} / {number(pages)}
      </span>
      {page < pages ? <Link href={`${href}&page=${page + 1}`}>NEXT &gt;</Link> : <span />}
    </nav>
  )
}
export function ScoresTable({ scores, offset = 0 }: { scores: Score[]; offset?: number }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col" className="rank">
              #
            </th>
            <th scope="col">PLAYER / GAME</th>
            <th scope="col" className="score-cell">
              SCORE
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={s.id}>
              <td className={`rank rank-${offset + i + 1}`}>
                {String(offset + i + 1).padStart(2, '0')}
              </td>
              <td className="player-cell">
                <span>{s.player_name}</span>
                <div className="score-game-line">
                  <Link className="score-game" href={`/games/${encodeURIComponent(s.game_slug)}`}>
                    {s.game_title}
                  </Link>
                  <span className="table-mode">{s.players}P</span>
                </div>
              </td>
              <td className="score-cell">{number(s.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
