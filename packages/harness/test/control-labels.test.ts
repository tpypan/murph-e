import assert from 'node:assert/strict'
import { test } from 'node:test'
import { controlLabel, controlReminders } from '../../../apps/cabinet/app/control-labels.ts'

test('in-game reminders stay bounded when generation returns detailed mappings', () => {
  assert.equal(
    controlLabel('Jump during a round; move selection upward in character select.'),
    'JUMP',
  )
  assert.equal(
    controlLabel('Quick attack during active play; confirm fighter selection.'),
    'QUICK ATTACK',
  )
  assert.equal(
    controlLabel(
      'Hold to block while grounded; tap to use the fighter special when energy is at least 25.',
    ),
    'BLOCK / SPECIAL',
  )
  assert.equal(controlLabel('Dash left'), 'DASH LEFT')
  assert.ok(
    controlLabel(
      'A very long unfamiliar action description that could previously collapse the viewport',
    ).length <= 18,
  )
  assert.ok(controlLabel('X'.repeat(200)).length <= 18)
})

test('fighter reminders preserve the actual modified-button actions', () => {
  assert.deepEqual(controlReminders('a', 'Lock / punch / down: sweep'), [
    'LOCK / PUNCH',
    'DOWN+A: SWEEP',
  ])
  assert.deepEqual(controlReminders('b', 'Unlock / kick / down: special'), [
    'UNLOCK / KICK',
    'DOWN+B: SPECIAL',
  ])
  assert.deepEqual(controlReminders('b', 'Up: throw; Down: drop'), ['UP+B: THROW', 'DOWN+B: DROP'])
  assert.deepEqual(controlReminders('a', 'Jump during a round; confirm selection'), ['JUMP'])
})
