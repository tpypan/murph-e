import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { ROOT } from './env.ts'
import type { GameCreator } from './game-attribution.ts'
import { addScore } from './scores.ts'
import type { GameSpec } from './spec.ts'

export interface PublicGame {
  slug: string
  title: string
  description: string
  genre: string
  creator_name: string
  supported_players: number[]
  source: 'generated' | 'catalog' | 'library' | 'template'
  created_at: string
}
export interface DeliveredGame {
  runId: string
  slug: string
  code: string
  sourceCode: string
  spec: GameSpec
  transcript: string
  creator: GameCreator | null
  source: 'build' | 'repair'
  model: string
  effort: string
  parts: unknown[]
  sprites: unknown[]
  thumbnail: string | null
  createdAt: string
}
export type CloudItem =
  | { kind: 'game'; game: PublicGame; thumbnail?: string | null; delivered?: DeliveredGame }
  | {
      kind: 'score'
      id: string
      sessionId: string
      game: PublicGame
      slot: number
      players: number
      badgeId: string | null
      name: string
      score: number
      outcome: 'win' | 'loss' | 'completed'
      at: string
    }
export interface PlaySession {
  id: string
  game: PublicGame
  players: 1 | 2
  identities: Array<GameCreator | null>
  startedAt: string
  result?: { scores: number[]; winner: number | null; state: 'win' | 'gameover'; at: string }
}
const defaultDir = process.env.HTN_ARCADE_DATA_DIR || resolve(ROOT, 'data/arcade')
function write(path: string, value: unknown) {
  mkdirSync(resolve(path, '..'), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600 })
  renameSync(temp, path)
}
export function queueCloudItem(item: CloudItem, dir = defaultDir) {
  const id = item.kind === 'game' ? `game:${item.game.slug}` : `score:${item.id}`
  const path = resolve(dir, 'outbox', `${createHash('sha256').update(id).digest('hex')}.json`)
  write(path, item)
}
export function pendingCloudItems(dir = defaultDir): Array<{ path: string; item: CloudItem }> {
  const folder = resolve(dir, 'outbox')
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const path = resolve(folder, f)
      return { path, item: JSON.parse(readFileSync(path, 'utf8')) as CloudItem }
    })
    .sort((a, b) => Number(a.item.kind === 'score') - Number(b.item.kind === 'score'))
}
export function acknowledgeCloudItem(path: string, expected: CloudItem) {
  // Do not remove a newer replacement that arrived during an upload.
  if (existsSync(path) && isDeepStrictEqual(JSON.parse(readFileSync(path, 'utf8')), expected))
    unlinkSync(path)
}
export function beginPlaySession(
  game: PublicGame,
  players: 1 | 2,
  identities: Array<GameCreator | null>,
  dir = defaultDir,
): PlaySession {
  const session: PlaySession = {
    id: randomUUID(),
    game,
    players,
    identities: identities.slice(0, players),
    startedAt: new Date().toISOString(),
  }
  write(resolve(dir, 'sessions', `${session.id}.json`), session)
  return session
}
export function completePlaySession(
  id: string,
  scores: unknown,
  state: unknown,
  winner: unknown,
  dir = defaultDir,
  scoresFile?: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('INVALID_SESSION')
  const path = resolve(dir, 'sessions', `${id}.json`)
  if (!existsSync(path)) throw new Error('UNKNOWN_SESSION')
  const session = JSON.parse(readFileSync(path, 'utf8')) as PlaySession
  if (
    !Array.isArray(scores) ||
    scores.length !== session.players ||
    scores.some((n) => !Number.isSafeInteger(n) || n < 0 || n > 2147483647)
  )
    throw new Error('INVALID_SCORES')
  if (state !== 'win' && state !== 'gameover') throw new Error('INVALID_RESULT')
  if (
    winner !== null &&
    (!Number.isInteger(winner) || Number(winner) < 0 || Number(winner) >= session.players)
  )
    throw new Error('INVALID_WINNER')
  if (
    session.result &&
    (!isDeepStrictEqual(session.result.scores, scores) ||
      session.result.state !== state ||
      session.result.winner !== winner)
  )
    throw new Error('RESULT_CONFLICT')
  session.result ??= {
    scores,
    state,
    winner: winner as number | null,
    at: new Date().toISOString(),
  }
  // Persist the result before queuing, so a retry after an interrupted write restores every slot.
  write(path, session)
  return scores.map((score, slot) => {
    const who = session.identities[slot]
    const item: Extract<CloudItem, { kind: 'score' }> = {
      kind: 'score',
      id: `${id}:${slot}`,
      sessionId: id,
      game: session.game,
      slot,
      players: session.players,
      badgeId: who?.badgeId ?? null,
      name: who?.name || 'GUEST',
      score,
      outcome:
        state === 'win' ? (winner === null || winner === slot ? 'win' : 'loss') : 'completed',
      at: session.result!.at,
    }
    queueCloudItem(item, dir)
    return addScore(
      {
        id: item.id,
        at: item.at,
        badgeId: item.badgeId,
        name: item.name,
        score,
        players: session.players,
        game: { slug: item.game.slug, title: item.game.title },
      },
      scoresFile,
    )
  })
}
