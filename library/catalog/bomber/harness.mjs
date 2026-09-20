import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const factory = Function(
  `return ${readFileSync(resolve(import.meta.dirname, 'module.js'), 'utf8')}`,
)()
export function harness(players = 1, config = {}) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    scores = [0, 0],
    terminal = [],
    inputs = []
  let count = 0
  const noop = () => {},
    game = factory(config),
    api = {
      players,
      W: 256,
      H: 224,
      btn: (b, p = 0) => held[p].has(b),
      btnp: (b, p = 0) => held[p].has(b) && !previous[p].has(b),
      score: (n) => {
        scores.fill(n)
      },
      addScore: (n, p = 0) => {
        scores[p] += n
      },
      win: (p) => terminal.push({ type: 'win', player: p }),
      gameOver: () => terminal.push({ type: 'gameOver' }),
      sfx: noop,
      cls: noop,
      rectfill: noop,
      rect: noop,
      line: noop,
      pset: noop,
      text: noop,
      textCenter: noop,
      spr: noop,
    }
  game.init(api)
  const keys = (p, ...buttons) => {
    const next = new Set(buttons)
    for (const b of held[p])
      if (!next.has(b)) inputs.push({ at: count, player: p, button: b, down: false })
    for (const b of next)
      if (!held[p].has(b)) inputs.push({ at: count, player: p, button: b, down: true })
    held[p] = next
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      game.update(api, 1 / 60)
      game.draw(api)
      for (let p = 0; p < 2; p++) previous[p] = new Set(held[p])
      count++
    }
    return game.inspect()
  }
  return { game, keys, step, scores, terminal, inputs, count: () => count }
}
