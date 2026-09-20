// Original project reference, not a ROM disassembly or a complete game.
// 19 x 19 tiles; at 10px/tile and origin (33, 26), fits 256 x 224 + HUD.
// # wall, . pellet, o power pickup, H house interior, = ghost-only door,
// space empty corridor, T paired horizontal tunnel. Keep the house pellet-free.
const MAZE_LAYOUT = [
  '###################',
  '#o......#.#......o#',
  '#.##.##.#.#.##.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###   ###.####',
  '   #.# ##=## #.#   ',
  '####.# #HHH# #.####',
  'T   .  #HHH#  .   T',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#..... .....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '###################',
];
const MAZE_HOME = { x: 9, y: 9 };
const MAZE_EXIT = { x: 9, y: 6 };
function mazeTile(x, y) { return MAZE_LAYOUT[y]?.[x] ?? '#'; }
function mazeCanEnter(x, y, state) {
  const t = mazeTile(x, y);
  if (t === '#') return false;
  if (t === 'H' || t === '=') return state === 'returning' || state === 'leaving' || state === 'house';
  return true;
}
function mazeNeighbor(x, y, dx, dy, state) {
  let nx = x + dx, ny = y + dy;
  // Wrapping is permitted only between the two tunnel mouths, never all edges.
  if (dy === 0 && mazeTile(x,y) === 'T') {
    if (nx < 0) nx = MAZE_LAYOUT[0].length - 1;
    if (nx >= MAZE_LAYOUT[0].length) nx = 0;
  }
  return mazeCanEnter(nx,ny,state) ? { x:nx, y:ny } : null;
}
function mazeStepToward(from, target, state) {
  const queue = [{ x:from.x, y:from.y, first:null }];
  const visited = new Set([from.y * 19 + from.x]);
  const dirs = [[0,-1],[-1,0],[0,1],[1,0]];
  for (let i = 0; i < queue.length && i < 361; i++) {
    const q = queue[i];
    if (q.x === target.x && q.y === target.y) return q.first;
    for (const [dx,dy] of dirs) {
      const n = mazeNeighbor(q.x,q.y,dx,dy,state);
      if (!n) continue;
      const key = n.y * 19 + n.x;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ ...n, first:q.first || n });
    }
  }
  return null;
}
function mazeGhost(id) {
  // Distinct visible slots in the house. Draw every waiting ghost's full body.
  return { id, x:8 + id % 3, y:8 + Math.floor(id / 3), state:'house', wait:180 + id * 45 };
}
function mazeCapture(g) {
  // Score once at the transition. Keep current coordinates: eyes travel home.
  if (g.state !== 'frightened') return false;
  g.state = 'returning';
  return true;
}
function mazeGhostTick(g, movementTick, powerActive) {
  if (g.state === 'house') {
    if (--g.wait <= 0) g.state = 'leaving';
    return;
  }
  if (g.state !== 'returning' && g.state !== 'leaving') return;
  const target = g.state === 'returning' ? MAZE_HOME : MAZE_EXIT;
  if (g.x === target.x && g.y === target.y) {
    if (g.state === 'returning') { g.state = 'house'; g.wait = 120; }
    else g.state = powerActive ? 'frightened' : 'chase';
    return;
  }
  if (movementTick) {
    const next = mazeStepToward(g,target,g.state);
    if (next) { g.x = next.x; g.y = next.y; }
  }
}
// Two original 12x12 frames, directly compatible with api.spr.
// Draw full bodies in house/leaving/chase, blue variants when frightened,
// and directional eyes ONLY during returning. Adapt palette to each identity.
const MAZE_GHOST_FRAMES = [
  ['....8888....','..88888888..','.88ee888888.','888ee8888888',
   '887778877788','887078870788','887778877788','888888888888',
   '888888888888','888888888888','888.8888.888','.8...88...8.'],
  ['....8888....','..88888888..','.88ee888888.','888ee8888888',
   '887778877788','887078870788','887778877788','888888888888',
   '888888888888','888888888888','.8888..8888.','..88....88..'],
];
