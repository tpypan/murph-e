import { BadgeHub, FakeTransport, type HubEvent, SerialTransport } from '@htn/badge'

// One hub per server process, watching the real serial ports and the fake
// badges that /api/badges/fake plugs in. globalThis survives Next's
// dev-mode module reloads, so the ports are opened exactly once.
const g = globalThis as typeof globalThis & { __badgeHub?: BadgeHub; __fakeBadges?: FakeTransport }

export function getFake(): FakeTransport {
  if (!g.__fakeBadges) g.__fakeBadges = new FakeTransport()
  return g.__fakeBadges
}

export function getHub(): BadgeHub {
  if (!g.__badgeHub) {
    const transports =
      process.env.HTN_BADGES === 'off' ? [getFake()] : [new SerialTransport(), getFake()]
    g.__badgeHub = new BadgeHub({ transports, pollMs: 500 })
    // The page drops hub errors, so a badge that stops taking mailbox writes
    // must at least show up in the server log.
    g.__badgeHub.on('event', (ev: HubEvent) => {
      if (ev.type === 'error') console.error(`[badge] ${ev.path}: ${ev.message}`)
    })
    g.__badgeHub.start()
  }
  return g.__badgeHub
}
