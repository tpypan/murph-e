import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
export const factory = Function(
  `return ${readFileSync(resolve(import.meta.dirname, 'module.js'), 'utf8')}`,
)()
export function harness(players = 1, config = {}) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    scores = [0, 0],
    events = []
  const api = new Proxy(
    {
      players,
      btn: (k, p = 0) => held[p].has(k),
      btnp: (k, p = 0) => held[p].has(k) && !previous[p].has(k),
      score: (n, p = 0) => (scores[p] = n),
      addScore: (n, p = 0) => (scores[p] += n),
      rnd: (n = 1) => 0.5 * n,
      win: (p) => events.push({ type: 'win', player: p }),
      gameOver: () => events.push({ type: 'gameOver' }),
    },
    { get: (t, k) => t[k] ?? (() => {}) },
  )
  const game = factory(config)
  game.init(api)
  return {
    game,
    api,
    scores,
    events,
    keys: (p, ...buttons) => (held[p] = new Set(buttons)),
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        game.update(api, 1 / 60)
        for (let p = 0; p < 2; p++) previous[p] = new Set(held[p])
      }
      return game.inspect()
    },
  }
}
export function drive(h, player = 0) {
  const s = h.game.inspect(),
    p = s.people[player],
    act = s.acts[p.act]
  if (p.dead || p.transition || p.finished) {
    h.keys(player)
    return
  }
  const nearGap = act.terrain.some(
    (point, i) => i && point[2] && p.x > act.terrain[i - 1][0] - 65 && p.x < point[0] + 10,
  )
  const nearEnemy = !p.roll && p.enemies.some((e) => !e.dead && e.x - p.x > 0 && e.x - p.x < 38)
  h.keys(
    player,
    'right',
    ...(nearGap || nearEnemy ? ['a'] : []),
    ...(!nearGap && p.grounded && Math.abs(p.vx) > 2 ? ['down'] : []),
  )
}
