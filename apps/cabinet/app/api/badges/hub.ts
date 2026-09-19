import { BadgeHub, FakeTransport, SerialTransport } from '@htn/badge'

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
    g.__badgeHub.start()
  }
  return g.__badgeHub
}
