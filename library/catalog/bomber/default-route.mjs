// Offline observation-only controller. All actions use ordinary held/button edges.
import { blastCells, paths, execute } from './route.mjs'
const key = (x, y) => y * 11 + x
export function defaultSolo(h, maxFrames = 14000, variant = 0) {
  while (h.count() < maxFrames && !h.terminal.length) {
    const s = h.game.inspect(),
      p = s.players[0]
    if (s.phase !== 'play' || !p.alive) {
      h.keys(0)
      h.step()
      continue
    }
    const living = s.enemies.filter((e) => e.alive),
      enemyCells = living.flatMap((e) => [e, ...(e.to ? [e.to] : [])])
    const distance = (q) =>
      Math.min(99, ...enemyCells.map((e) => Math.abs(e.x - q.x) + Math.abs(e.y - q.y)))
    const blocked = new Set(s.flames.map((f) => key(f.x, f.y)))
    for (const e of enemyCells) blocked.add(key(e.x, e.y))
    const danger = new Set(s.flames.map((f) => key(f.x, f.y)))
    for (const b of s.bombs) for (const k of blastCells(s, b)) danger.add(k)
    const options = paths(s, 0, blocked)
    const move = (q) => execute(h, 0, q.route.slice(0, 1))
    if (s.bombs.length || s.flames.length) {
      if (danger.has(key(p.x, p.y))) {
        const safe = options.filter((q) => q.route.length && !danger.has(key(q.x, q.y)))
        safe.sort((a, b) => a.route.length - b.route.length || distance(b) - distance(a))
        if (safe.length) {
          move(safe[0])
          continue
        }
      } else if (distance(p) < 3) {
        const safe = paths(s, 0, new Set([...blocked, ...danger])).filter(
          (q) => q.route.length === 1,
        )
        safe.sort((a, b) => distance(b) - distance(a))
        if (safe.length && distance(safe[0]) > distance(p)) {
          move(safe[0])
          continue
        }
      }
      h.keys(0)
      h.step(1)
      continue
    }
    if (!living.length) {
      const exit = options.find((q) => q.x === s.exit.x && q.y === s.exit.y)
      if (exit) {
        if (exit.route.length) move(exit)
        else {
          h.keys(0)
          h.step()
        }
        continue
      }
    }
    const prospective = blastCells(s, { x: p.x, y: p.y, range: p.range })
    const escape = options.filter(
      (q) => q.route.length && !prospective.has(key(q.x, q.y)) && distance(q) > 1,
    )
    escape.sort((a, b) => a.route.length - b.route.length || distance(b) - distance(a))
    if (
      escape.length &&
      (s.crates.some((c) => prospective.has(key(c.x, c.y))) || distance(p) <= p.range + 2)
    ) {
      h.keys(0, 'a')
      h.step()
      execute(h, 0, escape[0].route)
      continue
    }
    const target =
      living[(variant + Math.floor(s.ticks / 600)) % Math.max(1, living.length)] || s.exit
    const candidates = options.filter((q) => q.route.length && distance(q) > 0)
    candidates.sort((a, b) => {
      const score = (q) =>
        Math.abs(q.x - target.x) +
        Math.abs(q.y - target.y) +
        q.route.length * 0.2 +
        ((q.x * 17 + q.y * 13 + variant) % 7) * 0.05
      return score(a) - score(b)
    })
    if (candidates.length) move(candidates[0])
    else {
      h.keys(0)
      h.step()
    }
  }
  return h.game.inspect()
}

export function defaultVersus(h, victories = [1, 0, 0], maxFrames = 18000) {
  for (const winner of victories) {
    while (h.game.inspect().phase === 'roundEnd' && !h.terminal.length) h.step()
    if (h.terminal.length) break
    while (h.count() < maxFrames && !h.terminal.length && h.game.inspect().phase === 'play') {
      const s = h.game.inspect(),
        p = s.players[winner],
        target = s.players[1 - winner]
      h.keys(1 - winner)
      const ray = blastCells(s, { x: p.x, y: p.y, range: p.range })
      const escape = paths(s, winner).filter((q) => q.route.length && !ray.has(key(q.x, q.y)))
      escape.sort((a, b) => a.route.length - b.route.length)
      if (
        escape.length &&
        (ray.has(key(target.x, target.y)) || s.crates.some((c) => ray.has(key(c.x, c.y))))
      ) {
        h.keys(winner, 'a')
        h.step()
        execute(h, winner, escape[0].route)
        h.keys(winner)
        while (
          h.game.inspect().phase === 'play' &&
          (h.game.inspect().bombs.length || h.game.inspect().flames.length)
        )
          h.step()
        continue
      }
      const candidates = paths(s, winner).filter((q) => q.route.length)
      candidates.sort(
        (a, b) =>
          Math.abs(a.x - target.x) +
            Math.abs(a.y - target.y) -
            Math.abs(b.x - target.x) -
            Math.abs(b.y - target.y) || a.route.length - b.route.length,
      )
      if (candidates.length) execute(h, winner, candidates[0].route.slice(0, 1))
      else h.step()
    }
  }
  while (h.game.inspect().phase === 'roundEnd' && !h.terminal.length) h.step()
  return h.game.inspect()
}
