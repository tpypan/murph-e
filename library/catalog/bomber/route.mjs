// Read-only route planning for reproducible real-input tests. No state setters.
export const directions = [
  { x: 0, y: -1, name: 'up' },
  { x: 1, y: 0, name: 'right' },
  { x: 0, y: 1, name: 'down' },
  { x: -1, y: 0, name: 'left' },
]
const key = (x, y) => y * 11 + x
export const solid = (x, y) => x <= 0 || x >= 10 || y <= 0 || y >= 8 || (x % 2 === 0 && y % 2 === 0)
export function blastCells(state, bomb) {
  const cells = new Set([key(bomb.x, bomb.y)])
  for (const d of directions)
    for (let r = 1; r <= bomb.range; r++) {
      const x = bomb.x + d.x * r,
        y = bomb.y + d.y * r
      if (solid(x, y)) break
      cells.add(key(x, y))
      if (
        state.crates.some((c) => c.x === x && c.y === y) ||
        state.bombs.some((b) => b.x === x && b.y === y)
      )
        break
    }
  return cells
}
export function paths(state, player, avoid = new Set()) {
  const p = state.players[player],
    initial = key(p.x, p.y),
    queue = [{ x: p.x, y: p.y, route: [] }],
    visited = new Set([initial])
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i]
    for (const d of directions) {
      const x = q.x + d.x,
        y = q.y + d.y,
        k = key(x, y)
      if (
        visited.has(k) ||
        solid(x, y) ||
        avoid.has(k) ||
        state.crates.some((c) => c.x === x && c.y === y) ||
        state.bombs.some((b) => b.x === x && b.y === y)
      )
        continue
      visited.add(k)
      queue.push({ x, y, route: [...q.route, d.name] })
    }
  }
  return queue
}
export function execute(h, player, route) {
  for (const direction of route) {
    h.keys(player, direction)
    h.step(h.game.inspect().players[player].stepFrames)
  }
  h.keys(player)
}
export function escapeRoute(state, player, prospective = true) {
  const p = state.players[player],
    danger = new Set(state.flames.map((f) => key(f.x, f.y)))
  for (const b of [...state.bombs, ...(prospective ? [{ x: p.x, y: p.y, range: p.range }] : [])])
    for (const c of blastCells(state, b)) danger.add(c)
  const options = paths(state, player).filter(
    (q) => q.route.length > 0 && !danger.has(key(q.x, q.y)),
  )
  options.sort((a, b) => a.route.length - b.route.length)
  return options[0]?.route
}
export function soloBot(h, maxFrames = 10000) {
  while (h.count() < maxFrames && !h.terminal.length) {
    const s = h.game.inspect(),
      p = s.players[0]
    if (!p.alive || s.phase !== 'play') {
      h.keys(0)
      h.step(1)
      continue
    }
    if (s.bombs.length || s.flames.length) {
      const route = escapeRoute(s, 0, false)
      const danger = new Set(s.flames.map((f) => key(f.x, f.y)))
      for (const b of s.bombs) for (const c of blastCells(s, b)) danger.add(c)
      const activeEnemies = s.enemies.filter((e) => e.alive),
        distance = (q) =>
          Math.min(100, ...activeEnemies.map((e) => Math.abs(e.x - q.x) + Math.abs(e.y - q.y)))
      const blocked = new Set(s.flames.map((f) => key(f.x, f.y)))
      for (const e of activeEnemies) {
        blocked.add(key(e.x, e.y))
        if (e.to) blocked.add(key(e.to.x, e.to.y))
      }
      const safePaths = paths(s, 0, blocked).filter(
        (q) => q.route.length && !danger.has(key(q.x, q.y)),
      )
      safePaths.sort((a, b) => distance(b) - distance(a) || a.route.length - b.route.length)
      if (danger.has(key(p.x, p.y)) && route) execute(h, 0, route.slice(0, 1))
      else if (distance(p) <= 4 && safePaths.length) execute(h, 0, safePaths[0].route.slice(0, 1))
      else {
        h.keys(0)
        h.step(8)
      }
      continue
    }
    const living = s.enemies.filter((e) => e.alive)
    if (!living.length) {
      const route = paths(s, 0).find((q) => q.x === s.exit.x && q.y === s.exit.y)
      if (route) {
        execute(h, 0, route.route)
        h.step(1)
        continue
      }
    }
    const target = living[0] || s.exit
    const ray = blastCells(s, { x: p.x, y: p.y, range: p.range }),
      retreat = escapeRoute(s, 0)
    const nearbyCrate = s.crates.some((c) => ray.has(key(c.x, c.y))),
      nearbyEnemy = living.some((e) => Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= p.range + 1)
    if (retreat && (nearbyCrate || nearbyEnemy)) {
      h.keys(0, 'a')
      h.step(1)
      execute(h, 0, retreat)
      continue
    }
    const options = paths(s, 0).filter((q) => q.route.length)
    options.sort(
      (a, b) =>
        Math.abs(a.x - target.x) +
          Math.abs(a.y - target.y) -
          Math.abs(b.x - target.x) -
          Math.abs(b.y - target.y) || a.route.length - b.route.length,
    )
    if (options.length) execute(h, 0, options[0].route.slice(0, 1))
    else {
      h.keys(0)
      h.step(8)
    }
  }
  return h.game.inspect()
}
