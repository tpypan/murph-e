// pnpm badge watch   print every hub event as badges come and go
// pnpm badge push    same, but always reinstall the app on every badge
// pnpm badge fake    run the hub against two in-process fake badges through
//                    a whole plug / install / open / play / unplug scenario

import { FAKE_PRESETS, FakeTransport } from './fake.ts'
import { BadgeHub, type HubEvent } from './hub.ts'

const cmd = process.argv[2] ?? 'watch'
if (cmd !== 'watch' && cmd !== 'push' && cmd !== 'fake') {
  console.error('usage: badge <watch|push|fake>')
  process.exit(2)
}

const fake = new FakeTransport()
const hub = new BadgeHub({
  forcePush: cmd === 'push',
  ...(cmd === 'fake' ? { transports: [fake], pollMs: 50 } : {}),
})
const t0 = Date.now()
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(3).padStart(8)}s`

hub.on('event', (ev: HubEvent) => {
  const tail = ev.path ? ev.path.replace('/dev/cu.', '') : ''
  switch (ev.type) {
    case 'button':
      console.log(`${stamp()} ${tail} P${ev.slot + 1} ${ev.button} ${ev.down ? 'down' : 'up'}`)
      break
    case 'hello':
      console.log(
        `${stamp()} ${tail} HELLO P${ev.slot + 1} ${ev.identity.name} (${ev.identity.badgeId}) rgb ${ev.identity.color.join(',')}`,
      )
      break
    default:
      console.log(`${stamp()} ${tail} ${JSON.stringify(ev)}`)
  }
})

hub.start()

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

if (cmd === 'fake') {
  console.log('fake scenario: two badges, one never seen before')
  const a = fake.plug({ ...FAKE_PRESETS[0]!, installedVersion: '2', autoOpenMs: null })
  await sleep(400)
  console.log('-- player 1 opens the app')
  a.open()
  await sleep(100)
  a.tap('a')
  a.press('left', true)
  await sleep(100)
  a.press('left', false)
  console.log('-- player 2 plugs in a badge without the app')
  const b = fake.plug({ ...FAKE_PRESETS[1]!, autoOpenMs: 300 })
  await sleep(1500)
  b.tap('right')
  console.log('-- player 1 pulls the cable mid-game')
  fake.unplug(a.serial)
  await sleep(200)
  console.log(`-- roster: ${JSON.stringify(hub.badges())}`)
  await hub.stop()
  process.exit(0)
} else {
  console.log(
    `watching for badges (${cmd === 'push' ? 'forcing a push' : 'push only if missing'})…`,
  )
}

const bye = () => void hub.stop().then(() => process.exit(0))
process.once('SIGINT', bye)
process.once('SIGTERM', bye)
