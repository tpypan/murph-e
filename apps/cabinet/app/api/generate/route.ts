import {
  closeProbe,
  type PipelineEvent,
  pipeline,
  pipelineBoth,
  withAppGeneration,
} from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { transcript } -> server-sent pipeline events. Without `players` the
 * cabinet's default applies: a one-player and a two-player version are built
 * in parallel and every event carries its `players`, so the stream ends after
 * two `ready`s (or a version's fallback/error). `players: 1 | 2` builds one.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    transcript?: string
    race?: number
    players?: number
  }
  const transcript = String(body.transcript ?? '').trim()
  if (!transcript) return new Response('transcript required', { status: 400 })
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
      const players = body.players === 1 || body.players === 2 ? body.players : null
      const common = {
        race: body.race ?? 2,
        // The cabinet only creates new games. Ignore legacy clients' remix context.
        current: null,
        onEvent: send,
        signal: req.signal,
      }
      withAppGeneration(() =>
        players
          ? pipeline(transcript, { ...common, players })
          : pipelineBoth(transcript, common).then(() => undefined),
      )
        .catch((e: unknown) =>
          send({
            type: 'error',
            message: e instanceof Error ? e.message : String(e),
            terminal: true,
          }),
        )
        .finally(() => {
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
