import { closeProbe, type PipelineEvent, pipeline } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { transcript } -> server-sent pipeline events, ending with `ready`. */
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
      pipeline(transcript, {
        race: body.race ?? 2,
        players: body.players === 2 ? 2 : 1,
        onEvent: send,
        signal: req.signal,
      })
        .catch((e: unknown) =>
          send({ type: 'error', message: e instanceof Error ? e.message : String(e) }),
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
