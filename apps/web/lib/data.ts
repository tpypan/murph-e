import 'server-only'
import { createClient } from '@supabase/supabase-js'
export interface Game {
  slug: string
  title: string
  description: string
  genre: string
  creator_name: string
  supported_players: number[]
  thumbnail_url: string | null
  source: string
  created_at: string
}
export interface Score {
  id: string
  player_id: string
  player_name: string
  is_guest: boolean
  game_slug: string
  game_title: string
  thumbnail_url: string | null
  players: number
  score: number
  outcome: string
  played_at: string
}
export interface Stats {
  games: number
  players: number
  scores: number
}
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Gallery connection is not configured')
  // Publishable key only: this app cannot write games/scores or read private data.
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) }),
    },
  })
}
export const number = (n: number) => new Intl.NumberFormat('en-US').format(n)
export const label = (s: string) => s.replace(/[-_]/g, ' ')
export function queryText(s: string | undefined) {
  return (s ?? '')
    .trim()
    .slice(0, 80)
    .replace(/[%_,().]/g, ' ')
}
export async function getStats(): Promise<Stats> {
  const { data, error } = await database().from('arcade_stats').select('*').single()
  if (error) throw error
  return data as Stats
}
export async function getGames(filters: { q?: string; source?: string; page?: number } = {}) {
  const page = Math.max(1, Math.min(10000, Math.floor(filters.page || 1)))
  let query = database().from('arcade_games').select('*', { count: 'exact' })
  if (filters.source === 'generated') query = query.eq('source', 'generated')
  const q = queryText(filters.q)
  if (q) query = query.or(`title.ilike.%${q}%,creator_name.ilike.%${q}%,genre.ilike.%${q}%`)
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('slug')
    .range((page - 1) * 24, page * 24 - 1)
  if (error) throw error
  return { games: data as Game[], count: count ?? 0, page }
}
export async function getLeaderboard(
  filters: { game?: string; mode?: string; q?: string; page?: number } = {},
) {
  const page = Math.max(1, Math.min(10000, Math.floor(filters.page || 1)))
  let query = database().from('arcade_leaderboard').select('*', { count: 'exact' })
  if (filters.game) query = query.eq('game_slug', filters.game)
  if (filters.mode === '1' || filters.mode === '2')
    query = query.eq('players', Number(filters.mode))
  const q = queryText(filters.q)
  if (q) query = query.ilike('player_name', `%${q}%`)
  const { data, error, count } = await query
    .order('score', { ascending: false })
    .order('played_at')
    .order('id')
    .range((page - 1) * 25, page * 25 - 1)
  if (error) throw error
  return { scores: data as Score[], count: count ?? 0, page }
}
export async function gameOptions() {
  // Paginate past PostgREST's default row limit so every game remains filterable.
  const result: Array<{ slug: string; title: string }> = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await database()
      .from('arcade_games')
      .select('slug,title')
      .order('title')
      .order('slug')
      .range(start, start + 499)
    if (error) throw error
    result.push(...data)
    if (data.length < 500) return result
  }
}
