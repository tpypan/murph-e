// Read-only skill planner used to choose real joystick inputs. It never writes
// game state. Each proposed hop is checked against future moving lane geometry.
const deltas = { up: [0, -1], down: [0, 1], left: [-16, 0], right: [16, 0], wait: [0, 0] }
export function routeToHome(snapshot, playerIndex, homeIndex) {
  const p = snapshot.players[playerIndex],
    target = snapshot.homes[homeIndex]
  const hazardAt = (h, t) => ({
    ...h,
    x: 16 + ((((h.base + t * h.speed) % 320) + 320) % 320) - 48,
    active: h.kind !== 'turtle' || (t + h.id * 83 + h.row * 17) % 360 < 310,
  })
  function move(state, action) {
    const [dx, dr] = deltas[action],
      toRow = state.row + dr
    if (toRow < 0 || toRow > 10) return null
    let x = state.x
    const toX = x + dx
    if (toX < 22 || toX > 234) return null
    for (let n = 1; n <= 8; n++) {
      const time = state.time + n,
        hazards = snapshot.hazards.map((h) => hazardAt(h, time))
      const y = 36 + state.row * 16 + (dr * 16 * n) / 8
      if (action !== 'wait') x = state.x + (dx * n) / 8
      if (
        hazards.some(
          (h) => h.kind === 'car' && Math.abs(h.y - y) < 9 && Math.abs(h.x - x) < h.width / 2 + 4,
        )
      )
        return null
      if ((action === 'wait' || n === 8) && toRow >= 1 && toRow <= 4) {
        const support = hazards.find(
          (h) =>
            h.row === toRow && h.kind !== 'car' && h.active && Math.abs(h.x - x) < h.width / 2 - 3,
        )
        if (!support) return null
        x += support.speed
        if (x < 22 || x > 234) return null
      }
    }
    if (toRow === 0 && (Math.abs(target - x) >= 8 || snapshot.filled[homeIndex] !== null))
      return null
    return { x, row: toRow, time: state.time + 8, actions: [...state.actions, action] }
  }
  const open = [{ x: p.x, row: p.row, time: snapshot.laneTick, actions: [] }],
    visited = new Set()
  const cost = (s) => s.time - snapshot.laneTick + s.row * 8 + Math.abs(s.x - target) * 0.45
  for (let iter = 0; open.length && iter < 14000; iter++) {
    open.sort((a, b) => cost(a) - cost(b))
    const s = open.shift()
    if (s.row === 0) return s.actions
    const key = `${s.row}/${Math.round(s.x * 2)}/${s.time}`
    if (visited.has(key) || s.time - snapshot.laneTick > 400) continue
    visited.add(key)
    for (const action of ['up', 'left', 'right', 'wait', 'down']) {
      const n = move(s, action)
      if (n) open.push(n)
    }
  }
  return null
}
