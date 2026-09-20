import { createHash } from 'node:crypto'
import { acknowledgeCloudItem, type CloudItem, pendingCloudItems } from '@htn/harness'
import { createClient } from '@supabase/supabase-js'

export function cloudClient(env: NodeJS.ProcessEnv = process.env) {
  if (env.HTN_CLOUD_SYNC === 'off') return null
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(20000)
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
        return fetch(input, { ...init, signal })
      },
    },
  })
}
export async function uploadCloudItem(
  client: NonNullable<ReturnType<typeof cloudClient>>,
  item: CloudItem,
) {
  const check = (result: { error: unknown }) => {
    if (result.error) throw new Error('CLOUD_SYNC_FAILED', { cause: result.error })
  }
  if (item.kind === 'score') {
    check(
      await client
        .from('arcade_games')
        .upsert(item.game, { onConflict: 'slug', ignoreDuplicates: true })
        .abortSignal(AbortSignal.timeout(10000)),
    )
    check(
      await client
        .rpc('record_arcade_score', {
          p_id: item.id,
          p_session: item.sessionId,
          p_game: item.game.slug,
          p_slot: item.slot,
          p_mode: item.players,
          p_badge: item.badgeId,
          p_name: item.name,
          p_score: item.score,
          p_outcome: item.outcome,
          p_played_at: item.at,
        })
        .abortSignal(AbortSignal.timeout(10000)),
    )
    return
  }
  let thumbnail_url: string | undefined
  if (item.thumbnail) {
    const bytes = Buffer.from(item.thumbnail, 'base64')
    const hash = createHash('sha256').update(bytes).digest('hex')
    const path = `${hash}.png`
    check(
      await client.storage
        .from('arcade-thumbnails')
        .upload(path, bytes, { contentType: 'image/png', upsert: true, cacheControl: '31536000' }),
    )
    thumbnail_url = client.storage.from('arcade-thumbnails').getPublicUrl(path).data.publicUrl
  }
  if (item.delivered) {
    const d = item.delivered
    check(
      await client
        .from('generated_games')
        .upsert(
          {
            run_id: d.runId,
            slug: d.slug,
            title: d.spec.title,
            genre: d.spec.genre,
            players: d.spec.players,
            code_hash: createHash('sha256').update(d.code).digest('hex'),
            code: d.code,
            source_code: d.sourceCode,
            spec_json: d.spec,
            supported_players: item.game.supported_players,
            transcript: d.transcript,
            creator_badge_id: d.creator?.badgeId ?? null,
            creator_name: d.creator?.name || 'GUEST',
            parts_json: d.parts,
            sprites_json: d.sprites,
            thumbnail: d.thumbnail
              ? `\\x${Buffer.from(d.thumbnail, 'base64').toString('hex')}`
              : null,
            source: d.source,
            model: d.model,
            effort: d.effort,
            created_at: d.createdAt,
          },
          { onConflict: 'run_id', ignoreDuplicates: true },
        )
        .abortSignal(AbortSignal.timeout(10000)),
    )
  }
  check(
    await client
      .from('arcade_games')
      .upsert({ ...item.game, ...(thumbnail_url ? { thumbnail_url } : {}) }, { onConflict: 'slug' })
      .abortSignal(AbortSignal.timeout(10000)),
  )
}
let running: Promise<{ sent: number; pending: number }> | null = null
export function syncCloud() {
  if (running) return running
  running = (async () => {
    const client = cloudClient()
    if (!client) return { sent: 0, pending: pendingCloudItems().length }
    let sent = 0
    for (const { path, item } of pendingCloudItems()) {
      try {
        await uploadCloudItem(client, item)
        acknowledgeCloudItem(path, item)
        sent++
      } catch (error) {
        const cause =
          error instanceof Error
            ? (error.cause as { code?: string; statusCode?: string } | undefined)
            : undefined
        console.warn(
          `[arcade] ${item.kind} sync pending (${cause?.code || cause?.statusCode || 'network'}); local data retained.`,
        )
      }
    }
    return { sent, pending: pendingCloudItems().length }
  })().finally(() => {
    running = null
  })
  return running
}
const state = globalThis as typeof globalThis & {
  __arcadeSyncTimer?: ReturnType<typeof setInterval>
}
export function startCloudSync() {
  if (!state.__arcadeSyncTimer) {
    state.__arcadeSyncTimer = setInterval(() => {
      void syncCloud().catch(() => {})
    }, 30000)
    state.__arcadeSyncTimer.unref()
  }
  void syncCloud().catch(() => {})
}
