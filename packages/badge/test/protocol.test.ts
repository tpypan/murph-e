import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buttonName,
  DEFAULT_BUTTON_MAP,
  identityFromUitree,
  manifestVersion,
  parseLine,
  parseMap,
} from '../src/protocol.ts'

test('hello with a multi-word name', () => {
  const ev = parseLine(
    'I (94604) lua: [arcade] ARCADE HELLO quiet-phoenix-noble-bold Tony Pan 76 175 80',
  )
  assert.deepEqual(ev, {
    kind: 'hello',
    at: 94604,
    identity: { badgeId: 'quiet-phoenix-noble-bold', name: 'Tony Pan', color: [76, 175, 80] },
  })
})

test('a log line glued to the console prompt still parses', () => {
  const ev = parseLine('badge> I (7) lua: [arcade] B 0 1')
  assert.deepEqual(ev, { kind: 'button', at: 7, code: 0, down: true })
})

test('button press and release', () => {
  assert.deepEqual(parseLine('I (253154) lua: [arcade] B 5 1'), {
    kind: 'button',
    at: 253154,
    code: 5,
    down: true,
  })
  assert.deepEqual(parseLine('I (253334) lua: [arcade] B 5 0'), {
    kind: 'button',
    at: 253334,
    code: 5,
    down: false,
  })
})

test('bye, map and plain logs', () => {
  assert.deepEqual(parseLine('I (1) lua: [arcade] ARCADE BYE'), { kind: 'bye', at: 1 })
  assert.deepEqual(parseLine('I (2) lua: [arcade] ARCADE MAP UP=6 DOWN=3 A=0'), {
    kind: 'map',
    at: 2,
    map: { 6: 'up', 3: 'down', 0: 'a' },
  })
  assert.deepEqual(parseLine('I (3) lua: [arcade] hi there'), {
    kind: 'log',
    at: 3,
    text: 'hi there',
  })
})

test('other apps and firmware chatter are ignored', () => {
  assert.equal(parseLine('I (4) lua: [nearby] B 0 1'), null)
  assert.equal(parseLine('I (5) app_reg: heap 12345'), null)
  assert.equal(parseLine('badge> '), null)
})

test('button names follow the map, HOME and AUX1 are dropped', () => {
  assert.equal(buttonName(5, DEFAULT_BUTTON_MAP), 'right')
  assert.equal(buttonName(2, DEFAULT_BUTTON_MAP), null)
  assert.equal(buttonName(7, DEFAULT_BUTTON_MAP), null)
  assert.equal(buttonName(9, parseMap('A=9')), 'a')
})

test('identity from a uitree dump', () => {
  const dump = [
    'obj',
    '  label text="HTN ARCADE"',
    '  label text="Tony Pan"',
    '  label text="CONNECTED  -  HOME TO LEAVE"',
    '  label text="id=quiet-phoenix-noble-bold rgb=76,175,80"',
  ].join('\n')
  assert.deepEqual(identityFromUitree(dump), {
    badgeId: 'quiet-phoenix-noble-bold',
    name: 'Tony Pan',
    color: [76, 175, 80],
  })
  assert.equal(identityFromUitree('obj\n  label text="Badge ID: x"\n  qrcode'), null)
})

test('manifest version', () => {
  assert.equal(manifestVersion('cat x\r\nslug=arcade\r\nversion=2\r\nbadge> '), '2')
  assert.equal(manifestVersion('E: no such file\r\nbadge> '), null)
})
