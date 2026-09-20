import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Empty, GameArt, Header, ScoresTable } from '../../../components/ui'
import { database, type Game, getLeaderboard } from '../../../lib/data'
export const dynamic = 'force-dynamic'
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await database()
    .from('arcade_games')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!data) notFound()
  const game = data as Game
  const { scores } = await getLeaderboard({ game: slug })
  return (
    <>
      <Header tab="games" />
      <main id="content" className="detail-page">
        <Link className="back-link" href="/">
          &lt; ALL GAMES
        </Link>
        <section className="game-detail">
          <div className="detail-art">
            <GameArt game={game} priority />
          </div>
          <div>
            <h1>{game.title}</h1>
            <p className="made-by">BY {game.creator_name}</p>
            <p className="page-note">{game.supported_players.join(' / ')} PLAYER</p>
            {game.description && <p className="description">{game.description}</p>}
          </div>
        </section>
        <section>
          <h2 className="section-title">HIGH SCORES</h2>
          {scores.length ? (
            <ScoresTable scores={scores.slice(0, 5)} />
          ) : (
            <Empty title="NO SCORES YET">FINISH A ROUND TO SET A SCORE.</Empty>
          )}
          <Link className="more-link" href={`/leaderboard?game=${encodeURIComponent(slug)}`}>
            ALL SCORES &gt;
          </Link>
        </section>
      </main>
    </>
  )
}
