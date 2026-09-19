// pnpm badge watch   print every hub event as badges come and go
// pnpm badge push    same, but always reinstall the app on every badge

import { BadgeHub, type HubEvent } from './hub.ts'

const cmd = process.argv[2] ?? 'watch'
if (cmd !== 'watch' && cmd !== 'push') {
  console.error('usage: badge <watch|push>')
  process.exit(2)
}

const hub = new BadgeHub({ forcePush: cmd === 'push' })
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
console.log(`watching for badges (${cmd === 'push' ? 'forcing a push' : 'push only if missing'})…`)

const bye = () => void hub.stop().then(() => process.exit(0))
process.once('SIGINT', bye)
process.once('SIGTERM', bye)
