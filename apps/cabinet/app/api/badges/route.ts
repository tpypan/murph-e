import { BadgeHub, type HubEvent } from '@htn/badge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// One hub per server process. globalThis survives Next's dev-mode module
// reloads, so the serial ports are opened exactly once.
const g = globalThis as typeof globalThis & { __badgeHub?: BadgeHub }
function getHub(): BadgeHub {
  if (!g.__badgeHub) {
    g.__badgeHub = new BadgeHub()
    g.__badgeHub.start()
  }
  return g.__badgeHub
}

/** GET -> server-sent events: a `roster` snapshot, then every hub event. */
export async function GET(req: Request): Promise<Response> {
  const hub = getHub()
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (ev: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
        } catch {}
      }
      send({ type: 'roster', badges: hub.badges() })
      const on = (ev: HubEvent) => send(ev)
      hub.on('event', on)
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {}
      }, 15000)
      req.signal.addEventListener('abort', () => {
        hub.off('event', on)
        clearInterval(ping)
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
