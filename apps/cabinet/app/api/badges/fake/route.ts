import { FAKE_PRESETS, type FakeBadgeOptions } from '@htn/badge'
import { getFake, getHub } from '../hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dev tool: plug virtual badges into the running cabinet. They go through
// the same hub, push and hello path as a real badge, so the whole 2P flow
// can be driven without hardware (docs/plans/tier-2.md M0).
//
//   POST { op: 'plug', badgeId, name, color, installedVersion?, inApp? }
//   POST { op: 'toggle', n: 1 | 2 }          preset badge n: plug+open, or unplug
//   POST { op: 'open' | 'exit' | 'unplug', serial }
//   POST { op: 'press', serial, button, down }   or { op: 'tap', serial, button }
//   GET                                       every fake badge and its state

type Body = {
  op?: string
  serial?: string
  n?: number
  button?: string
  down?: boolean
} & Partial<FakeBadgeOptions>

function snapshot() {
  return getFake()
    .all()
    .map((b) => ({
      serial: b.serial,
      path: b.path,
      identity: b.identity,
      installedVersion: b.installedVersion,
      inApp: b.inApp,
      connected: b.connected,
    }))
}

export function GET(): Response {
  getHub()
  return Response.json({ badges: snapshot() })
}

export async function POST(req: Request): Promise<Response> {
  const hub = getHub()
  const fake = getFake()
  const body = (await req.json().catch(() => ({}))) as Body
  const bad = (m: string) => Response.json({ error: m }, { status: 400 })
  const badge = () => (body.serial ? fake.get(body.serial) : undefined)
  switch (body.op) {
    case 'plug': {
      if (!body.badgeId || !body.name || !body.color) return bad('badgeId, name, color required')
      const b = fake.plug({
        serial: body.serial,
        badgeId: body.badgeId,
        name: body.name,
        color: body.color,
        installedVersion: body.installedVersion ?? null,
        inApp: body.inApp,
        autoOpenMs: body.autoOpenMs ?? null,
      })
      await hub.poll()
      return Response.json({ serial: b.serial, path: b.path })
    }
    case 'toggle': {
      const preset = FAKE_PRESETS[(body.n ?? 1) - 1]
      if (!preset) return bad('n must be 1 or 2')
      const existing = fake.get(preset.serial!)
      if (existing) {
        fake.unplug(existing.serial)
        return Response.json({ serial: existing.serial, plugged: false })
      }
      // Preset 1 already has the app (the common case); preset 2 gets it pushed.
      const b = fake.plug({
        ...preset,
        installedVersion: body.n === 2 ? null : '2',
        autoOpenMs: 300,
      })
      await hub.poll()
      // A badge that already has the app is opened by "the player" after a beat.
      if (b.installedVersion !== null) setTimeout(() => b.connected && b.open(), 600)
      return Response.json({ serial: b.serial, plugged: true })
    }
    case 'open': {
      const b = badge()
      if (!b) return bad('no such badge')
      b.open()
      return Response.json({ ok: true })
    }
    case 'exit': {
      const b = badge()
      if (!b) return bad('no such badge')
      b.exit()
      return Response.json({ ok: true })
    }
    case 'unplug':
      return body.serial && fake.unplug(body.serial)
        ? Response.json({ ok: true })
        : bad('no such badge')
    case 'press': {
      const b = badge()
      if (!b || !body.button) return bad('serial and button required')
      b.press(body.button, body.down !== false)
      return Response.json({ ok: true })
    }
    case 'tap': {
      const b = badge()
      if (!b || !body.button) return bad('serial and button required')
      b.tap(body.button)
      return Response.json({ ok: true })
    }
    default:
      return bad('unknown op')
  }
}
