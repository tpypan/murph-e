// Original project component example, not a complete game or external engine.
// Positions are feet anchors. Face is +1 right / -1 left. Times are 60Hz frames.
// Use the SAME sampled phase for the pose and hitbox. Adapt moves, don't add
// these exact attacks when the user's request needs a different mechanic.
const COMBAT_MOVES = {
  jab: { startup:6, active:3, recovery:12, damage:7, stun:14, push:5,
    reach:25, height:12, lift:36, poses:['jab-windup','jab-contact','jab-recover'] },
  heavy: { startup:14, active:4, recovery:24, damage:16, stun:23, push:12,
    reach:34, height:16, lift:30, poses:['heavy-windup','heavy-contact','heavy-recover'] },
};
function combatPhase(name, age) {
  const m = COMBAT_MOVES[name];
  if (!m || age >= m.startup + m.active + m.recovery) return { pose:'idle', active:false, done:true };
  const phase = age < m.startup ? 0 : age < m.startup + m.active ? 1 : 2;
  return { pose:m.poses[phase], active:phase === 1, done:false };
}
function combatStart(f, name) {
  if (f.move || f.stun > 0 || !COMBAT_MOVES[name] || f.hp <= 0) return false;
  f.move = name; f.moveAge = 0; f.hitTargets = [];
  return true;
}
function combatBox(f) {
  const phase = combatPhase(f.move, f.moveAge);
  if (!phase.active) return null;
  const m = COMBAT_MOVES[f.move];
  return { x:f.face > 0 ? f.x : f.x - m.reach, y:f.y - m.lift, w:m.reach, h:m.height };
}
function combatOverlap(a,b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function combatHit(attacker, defender, hurtbox) {
  const box = combatBox(attacker);
  if (!box || defender.hp <= 0 || attacker.hitTargets.includes(defender.id) || !combatOverlap(box,hurtbox)) return null;
  attacker.hitTargets.push(defender.id); // One hit per target per attack, even after hitstop.
  const m = COMBAT_MOVES[attacker.move];
  const facingAttack = (attacker.x - defender.x) * defender.face > 0;
  const blocked = defender.blocking && !defender.move && defender.stun <= 0 && facingAttack;
  defender.hp = Math.max(0, defender.hp - (blocked ? 0 : m.damage));
  defender.stun = blocked ? 7 : m.stun;
  if (!blocked) { defender.move = null; defender.moveAge = 0; }
  defender.x += attacker.face * (blocked ? 2 : m.push);
  return { blocked, damage:blocked ? 0 : m.damage, hitstop:blocked ? 3 : 5 };
}
function combatAdvance(f) {
  if (f.stun > 0) { f.stun--; return; }
  if (!f.move) return;
  f.moveAge++;
  if (combatPhase(f.move,f.moveAge).done) { f.move = null; f.moveAge = 0; }
}
// Integration: on each non-hitstop update advance existing attacks FIRST,
// accept new input SECOND, resolve hits THIRD; draw samples the resulting age.
// Keep a shared hitstop counter; while > 0, freeze both movement and moveAge.
// End the round exactly once at KO/timeout; emit api.win / api.gameOver at match end.
// Provide art for every named pose: whole-body weight shift, supporting foot,
// torso/shoulder turn, extended striking limb, then a visibly withdrawn recovery.
// These timings are example tuning, not copied Street Fighter frame data.
