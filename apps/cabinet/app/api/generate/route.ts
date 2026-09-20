import { closeProbe, type PipelineEvent, pipeline, withAppGeneration } from '@htn/harness'
import { getHub } from '../badges/hub'
import { startCloudSync } from '../cloud-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { transcript, players? } -> one shared game, checked in both player modes.
 * `players` chooses the initial session mode, never another generated version.
 * The cabinet always starts one build; legacy client race values are ignored.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    transcript?: string
    players?: number
  }
  const transcript = String(body.transcript ?? '').trim()
  if (!transcript) return new Response('transcript required', { status: 400 })
  const badge = getHub()
    .badges()
    .filter((b) => b.state === 'ready' && b.identity && b.slot !== null)
    .sort((a, b) => a.slot! - b.slot!)[0]
  const creator = badge?.identity
    ? { badgeId: badge.identity.badgeId, name: badge.identity.name }
    : null
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (ev: PipelineEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
        } catch {
          closed = true
        }
      }
      const players = body.players === 2 ? 2 : 1
      const common = {
        race: 1,
        creator,
        publish: true,
        // The cabinet only creates new games. Ignore legacy clients' remix context.
        current: null,
        onEvent: send,
        signal: req.signal,
      }
      withAppGeneration(() => pipeline(transcript, { ...common, players }))
        .catch((e: unknown) =>
          send({
            type: 'error',
            message: e instanceof Error ? e.message : String(e),
            terminal: true,
          }),
        )
        .finally(() => {
          startCloudSync()
          closed = true
          try {
            controller.close()
          } catch {}
        })
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// Keep the shared headless browser alive across requests; close on shutdown.
process.once('SIGTERM', () => void closeProbe())
process.once('SIGINT', () => void closeProbe())
