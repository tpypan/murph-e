import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { FakeBadge, FakeTransport } from '../src/fake.ts'
import { BadgeHub, type HubEvent } from '../src/hub.ts'
import { BadgeLink } from '../src/link.ts'
import { APP_SLUG, APP_VERSION } from '../src/protocol.ts'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'app')
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Wait until an event of this type (matching `where`) has been seen. */
function waiter(events: HubEvent[]) {
  return async (
    type: HubEvent['type'],
    where: (e: HubEvent) => boolean = () => true,
    ms = 15000,
  ) => {
    const t0 = Date.now()
    let seen = 0
    while (Date.now() - t0 < ms) {
      for (; seen < events.length; seen++) {
        const e = events[seen]!
        if (e.type === type && where(e)) return e
      }
      await sleep(10)
    }
    throw new Error(`no ${type} event within ${ms} ms; got ${events.map((e) => e.type).join(',')}`)
  }
}

test('hub against fake badges: install, hello, buttons, bye, unplug', async () => {
  const fake = new FakeTransport()
  const hub = new BadgeHub({ transports: [fake], pollMs: 20 })
  const events: HubEvent[] = []
  hub.on('event', (e: HubEvent) => events.push(e))
  const next = waiter(events)
  hub.start()
  try {
    // A badge that already has the current app: no push, waits for the player.
    const a = fake.plug({
      badgeId: 'quiet-phoenix-noble-bold',
      name: 'Tony Pan',
      color: [76, 175, 80],
      installedVersion: APP_VERSION,
    })
    await next('attached', (e) => e.path === a.path)
    await next('waiting', (e) => e.path === a.path)
    assert.ok(!events.some((e) => e.type === 'installing'), 'no push for a current badge')

    a.open()
    const helloA = await next('hello', (e) => e.path === a.path)
    assert.equal(helloA.type, 'hello')
    if (helloA.type !== 'hello') return
    assert.equal(helloA.slot, 0)
    assert.equal(helloA.identity.name, 'Tony Pan')

    a.press('left', true)
    const down = await next('button', (e) => e.type === 'button' && e.button === 'left' && e.down)
    if (down.type !== 'button') return
    assert.equal(down.slot, 0)
    assert.equal(down.badgeId, 'quiet-phoenix-noble-bold')
    a.press('left', false)
    await next('button', (e) => e.type === 'button' && e.button === 'left' && !e.down)
    // HOME never reaches the game.
    a.tap('home')
    await sleep(50)
    assert.ok(!events.some((e) => e.type === 'button' && (e.button as string) === 'home'))

    // A badge that has never seen the cabinet: the app is pushed in paced chunks.
    const b = fake.plug({
      badgeId: 'brave-otter-swift-calm',
      name: 'Sam Rivera',
      color: [41, 173, 255],
      installedVersion: null,
    })
    await next('installing', (e) => e.path === b.path)
    const installed = await next('installed', (e) => e.path === b.path, 10000)
    if (installed.type !== 'installed') return
    assert.equal(b.installedVersion, APP_VERSION)
    const lua = readFileSync(join(APP_DIR, 'main.lua'))
    assert.deepEqual(b.files.get(`/littlefs/apps/${APP_SLUG}/main.lua`), new Uint8Array(lua))
    assert.ok(b.maxWrite <= 128, `largest chunk ${b.maxWrite}`)
    assert.deepEqual(
      b.files.get(`/littlefs/apps/${APP_SLUG}/font-white16-0.bin`),
      new Uint8Array(readFileSync(join(APP_DIR, 'font-white16-0.bin'))),
    )
    assert.ok(!b.wedged)
    await next('waiting', (e) => e.path === b.path)

    b.open()
    const helloB = await next('hello', (e) => e.path === b.path)
    if (helloB.type !== 'hello') return
    assert.equal(helloB.slot, 1)
    b.tap('right')
    const rb = await next('button', (e) => e.type === 'button' && e.slot === 1)
    if (rb.type !== 'button') return
    assert.equal(rb.button, 'right')

    // Player 1 leaves the app and comes back: same slot.
    a.exit()
    const bye = await next('bye', (e) => e.path === a.path)
    if (bye.type !== 'bye') return
    assert.equal(bye.slot, 0)
    a.open()
    const again = await next(
      'hello',
      (e) => e.path === a.path && events.indexOf(e) > events.indexOf(bye),
    )
    if (again.type !== 'hello') return
    assert.equal(again.slot, 0)

    // Cable pulled.
    fake.unplug(b.serial)
    const det = await next('detached', (e) => e.path === b.path)
    if (det.type !== 'detached') return
    assert.equal(det.slot, 1)
    assert.deepEqual(
      hub.badges().map((x) => x.path),
      [a.path],
    )

    // A badge that is already in the app when plugged in is identified by uitree.
    const c = fake.plug({
      badgeId: 'calm-heron-bright-sun',
      name: 'Kai',
      color: [255, 236, 39],
      installedVersion: APP_VERSION,
      inApp: true,
    })
    const helloC = await next('hello', (e) => e.path === c.path)
    if (helloC.type !== 'hello') return
    assert.equal(helloC.slot, 1)
    assert.equal(helloC.identity.name, 'Kai')
    assert.ok(!events.some((e) => e.type === 'waiting' && e.path === c.path))
  } finally {
    await hub.stop()
  }
})

test('an unpaced put wedges the badge; the link paces it', async () => {
  const big = new Uint8Array(666).fill(65)
  const wedgeMe = new FakeBadge({ badgeId: 'x', name: 'x', color: [0, 0, 0] })
  const wire = wedgeMe.connect()
  let got = ''
  wire.onData((t) => {
    got += t
  })
  await wire.write(Buffer.from('put /littlefs/apps/arcade/main.lua 666\r'))
  await sleep(20)
  assert.ok(got.includes('READY'))
  await wire.write(big)
  await sleep(50)
  assert.ok(wedgeMe.wedged)
  assert.ok(!got.includes('OK 666'))

  const paced = new FakeBadge({ badgeId: 'y', name: 'y', color: [0, 0, 0] })
  const link = new BadgeLink(paced.connect())
  await link.writeLine('put /littlefs/apps/arcade/main.lua 666')
  await link.waitFor('READY', 500)
  await link.writeBytes(big)
  await link.waitFor('OK 666', 1000)
  assert.equal(paced.maxWrite, 128)
  assert.deepEqual(paced.files.get('/littlefs/apps/arcade/main.lua'), big)
})

test('display mailbox follows actual slots, mode and latest controls without reloading', async () => {
  const fake = new FakeTransport()
  const hub = new BadgeHub({ transports: [fake], pollMs: 20 })
  const events: HubEvent[] = []
  hub.on('event', (e: HubEvent) => events.push(e))
  const next = waiter(events)
  hub.setDisplay({ players: 2, playing: true, controls: { a: 'Jump', b: 'Dash' } })
  hub.start()
  try {
    const a = fake.plug({
      badgeId: 'one',
      name: 'One',
      color: [1, 2, 3],
      installedVersion: APP_VERSION,
      inApp: true,
    })
    await next('hello', (e) => e.path === a.path)
    const b = fake.plug({
      badgeId: 'two',
      name: 'Two',
      color: [4, 5, 6],
      installedVersion: APP_VERSION,
      inApp: true,
    })
    await next('hello', (e) => e.path === b.path)
    const text = (badge: FakeBadge) =>
      new TextDecoder().decode(badge.files.get('/littlefs/apps/arcade/display.txt'))
    const waitText = async (badge: FakeBadge, expected: string) => {
      for (let i = 0; i < 100 && !text(badge).includes(expected); i++) await sleep(20)
      assert.ok(text(badge).includes(expected), text(badge))
    }
    await waitText(a, 'PLAYER 1')
    await waitText(b, 'PLAYER 2')
    assert.ok(text(b).includes('A: JUMP'))
    hub.setDisplay({ players: 1, playing: true, controls: { a: 'Attack\nEND\n', b: null } })
    hub.setDisplay({ players: 1, playing: true, controls: { a: 'Punch', b: 'Block' } })
    await waitText(b, 'B: BLOCK')
    assert.ok(text(b).includes('PLAYER 1'))
    assert.ok(a.inApp && b.inApp, 'display updates must not reload or exit the app')
    b.tap('a')
    await next('button', (e) => e.type === 'button' && e.path === b.path && e.down)
    assert.ok(!a.wedged && !b.wedged)
  } finally {
    await hub.stop()
  }
})

test('pixel-font bundle fits the badge app limits', () => {
  const files = readdirSync(APP_DIR)
  assert.ok(files.length <= 16)
  assert.ok(
    files.reduce((sum, name) => sum + readFileSync(join(APP_DIR, name)).length, 0) <= 48 * 1024,
  )
  for (const name of files.filter((name) => name.endsWith('.bin'))) {
    const bytes = readFileSync(join(APP_DIR, name))
    assert.equal(bytes[0], 0x19)
    assert.equal(bytes[1], 0x12) // RGB565; no indexed palette decoding.
    assert.equal(bytes.length, 12 + bytes.readUInt16LE(8) * bytes.readUInt16LE(6))
    assert.ok(bytes.length <= 16 * 1024)
  }
})
