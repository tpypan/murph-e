// The cabinet board's Gamepad API decoding: the analog stick on axes 0/1 with
// up as +Y, and A B X Y on buttons 0..3 (apps/cabinet/app/input.ts GAMEPAD).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GAMEPAD, gamepadInputs } from '../../../apps/cabinet/app/input.ts'

const pad = (axes, pressed = []) => ({
  axes,
  buttons: Array.from({ length: 32 }, (_, i) => ({ pressed: pressed.includes(i) })),
})
const held = (p) => [...gamepadInputs(p)].sort()

test('centred stick and no buttons hold nothing', () => {
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0])), [])
  assert.deepEqual(held(pad([0.3, -0.3, 0, 0, 0, 0])), [], 'inside the dead zone')
})

test('the stick maps with up as +Y, as the board reports it', () => {
  assert.deepEqual(held(pad([0, 1, 0, 0, 0, 0])), ['up'])
  assert.deepEqual(held(pad([0, -1, 0, 0, 0, 0])), ['down'])
  assert.deepEqual(held(pad([-1, 0, 0, 0, 0, 0])), ['left'])
  assert.deepEqual(held(pad([1, 0, 0, 0, 0, 0])), ['right'])
  assert.deepEqual(held(pad([0.9, 0.9, 0, 0, 0, 0])), ['right', 'up'], 'diagonals hold both')
})

test('A B X Y are buttons 0 to 3; other buttons and axes do nothing', () => {
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0], [0])), ['a'])
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0], [1])), ['b'])
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0], [2])), ['x'])
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0], [3])), ['y'])
  assert.deepEqual(held(pad([0, 0, 1, 1, 1, 1], [7, 31])), [])
  assert.deepEqual(held(pad([0, 0, 0, 0, 0, 0], [0, 1, 2, 3])), ['a', 'b', 'x', 'y'])
})

test('the map names the board', () => {
  assert.equal(GAMEPAD.idIncludes, 'Arcade')
  assert.equal(GAMEPAD.yUp, 1)
})
