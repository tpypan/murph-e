import { normalized, requestClauses } from './request-text.ts'
import type { SpriteRecord } from './sprite-catalog.ts'

const fighterClips = [
  'idle',
  'walk',
  'jump',
  'crouch',
  'light',
  'airLight',
  'airHeavy',
  'heavy',
  'sweep',
  'special',
  'dash',
  'guard',
  'crouchGuard',
  'hurt',
  'ko',
  'victory',
]
const attackClips = new Set(['light', 'airLight', 'airHeavy', 'heavy', 'sweep', 'special', 'dash'])

/** Mirrors the ART.character contract before offering assets to a fighting-game builder. */
export function fighterCompatibility(sprite: SpriteRecord): string[] {
  const missing = fighterClips
    .filter((clip) => !sprite.animations[clip])
    .map((clip) => `missing ${clip}`)
  if (sprite.camera === 'top-down') missing.push('top-down camera')
  if (
    !/(?:feet|anchor)[ -](?:relative|origin)|relative to (?:the )?(?:feet|anchor)/i.test(
      sprite.coordinates,
    )
  )
    missing.push('requires feet/anchor-relative geometry')
  for (const [name, clip] of Object.entries(sprite.animations)) {
    if (clip.flipX) missing.push(`pre-mirrored ${name}`)
    if (attackClips.has(name) && clip.steps.length < 3)
      missing.push(`incomplete attack phases: ${name}`)
    if (clip.steps.some((step) => !Number.isInteger(step.durationTicks) || step.durationTicks < 1))
      missing.push(`non-integer timing: ${name}`)
    if (
      clip.steps.some((step) =>
        [...step.hitboxes, ...step.hurtboxes].some(
          (box) => box.shape === 'circle' || !Number.isFinite(box.w) || !Number.isFinite(box.h),
        ),
      )
    )
      missing.push(`non-rectangular collision: ${name}`)
  }
  return missing
}

function aliases(sprite: SpriteRecord): string[] {
  const id = normalized(sprite.id.split('/').at(-1)!).trim()
  const identity = id
    .replace(/\b(?:held|item|blue|green|red|yellow|white|black|orange)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // A pack's theme tags ("Marvel", "DC", "Sonic 2", "fighter") describe context,
  // not an assertion that every object in that pack is the requested character.
  const matchingTags = sprite.tags
    .map((tag) => normalized(tag).trim())
    .filter((tag) => tag.replaceAll(' ', '') === identity.replaceAll(' ', ''))
  return [
    ...new Set(
      [id, normalized(sprite.subject.replace(/\([^)]*\)/g, '')).trim(), ...matchingTags].filter(
        Boolean,
      ),
    ),
  ]
}

/** Match positive identities and actual animation coverage, never just a shared franchise. */
export function selectSpriteAssets(
  transcript: string,
  spec: { genre?: string; moderated?: boolean },
  sprites: SpriteRecord[],
): SpriteRecord[] {
  if (spec.moderated) return []
  const clauses = requestClauses(transcript)
  const query = normalized(clauses.positive),
    negative = normalized(clauses.negative)
  const mechanics = `${query} ${normalized(spec.genre ?? '')}`
  const fighter = /\b(?:fighter|fighting|street fighter|versus fighting)\b/.test(mechanics)
  const sideView =
    /\b(fighter|fighting|street fighter|platformer|donkey kong|kart|racing|side view)\b/.test(
      mechanics,
    )
  const topDown = /\btop down\b/.test(mechanics)
  const matches = sprites
    .filter(
      (s) =>
        s.status !== 'draft' &&
        !(sideView && s.camera === 'top-down') &&
        !(topDown && s.camera === 'side-view'),
    )
    .filter((s) => !fighter || fighterCompatibility(s).length === 0)
    .map((sprite) => {
      const names = aliases(sprite)
      const positive = names.filter((name) => query.includes(` ${name} `))
      const excluded = names.some((name) => negative.includes(` ${name} `))
      return {
        sprite,
        identity: normalized(sprite.id.split('/').at(-1)!).trim(),
        position: Math.min(...positive.map((name) => query.indexOf(` ${name} `))),
        score: excluded
          ? 0
          : positive.reduce((best, name) => Math.max(best, name.split(' ').length), 0),
      }
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        a.position - b.position ||
        b.score - a.score ||
        Number(b.sprite.status === 'source-checked') -
          Number(a.sprite.status === 'source-checked') ||
        a.sprite.id.localeCompare(b.sprite.id),
    )
  const seen = new Set<string>()
  return matches
    .filter((row) => {
      if (seen.has(row.identity)) return false
      seen.add(row.identity)
      return true
    })
    .slice(0, 4)
    .map((row) => row.sprite)
}

export function spriteContract(sprites: SpriteRecord[]): string {
  if (!sprites.length) return ''
  return [
    '=== AVAILABLE LOCAL SPRITE ASSETS ===',
    'These actual saved pixels, timing and geometry are linked automatically when you use ART.get("id"). Do not print their pixel arrays. In init: actor = ART.get("exact-id"). In draw: actor.draw(api, "clip-name", animationTicks, x, y, flipX). x/y locate the authored anchor; ticks are 60 Hz and should restart at state entry. draw returns the selected frame metadata. actor.frame(clip,ticks,flipX) returns {pixels,palette?,layers?,anchor,hitboxes,hurtboxes,flipX} without drawing. Optional layers:[{pixels,palette}] are up to 8 extra full-canvas color planes, each with its own palette of at most 16 exact RGB colors. actor.draw renders the base then layers in array order; later opaque pixels overlay earlier ones. Every plane shares the same anchor, position and flip; dot pixels are transparent, while slot 0 is opaque (including black). For manual drawing, draw the base then every layer with api.spr(plane.pixels,Math.round(x-f.anchor.x),Math.round(y-f.anchor.y),f.flipX,false,plane.palette). Mirrored anchors and boxes are already transformed. Pixels remain original and flipX tells api.spr how to draw them. Optional frame.palette is forwarded as the sixth api.spr argument to retain exact source colors. actor.frames and actor.animations expose the full saved data. No scaling argument. Only listed clips exist; never assume a pose supplies combat timing or hitboxes. Implement game-specific behavior and test collision against the stated coordinate system. Respect the listed camera and supported poses; top-down sets cannot supply side-view combat animation. Do not substitute these for a different requested character.',
    'Optional actor.projectile preserves {travel,impact?,bind?,speed,life,box,bindTicks?}; its clip names refer to this same set. A step projectileOrigin is always on the unmirrored frame canvas, while projectile.box is anchor-relative geometry. actor.frame also returns projectileOrigin? mirrored with its anchor, so the launch offset is f.projectileOrigin-f.anchor. ART uses boundary-style width-x anchor mirroring; actor.character() instead returns a fresh, unmirrored {frames,animations,projectile?} in the fighter frames/duration format, with original source anchors and sockets for that controller to mirror. Use assets:{"exact-roster-id":actor.character()} only for a complete compatible side-view fighter set with feet-relative rectangle geometry and integer 60 Hz timing. It rejects missing combat clips, pre-mirrored clips and incompatible coordinates; it never fills poses or changes character identity.',
    ...sprites.map(
      (s) =>
        `${s.id}: ${s.subject}; camera=${s.camera}; ${Object.keys(s.frames).length} frames; clips=${Object.keys(s.animations).join(', ')}. Fighter adapter: ${fighterCompatibility(s).length ? 'incompatible; use only declared clips with your own controller' : 'complete ART.get(id).character() contract'}. Coordinates: ${s.coordinates}. Unsupported: ${s.unsupportedStates.join(', ') || 'only declared clips are supplied'}. Source hash: ${s.hash}.`,
    ),
  ].join('\n')
}

/** Plain JS embedded in a standalone game; no changes to the runtime API. */
export const ART_RUNTIME = `(function(sets) {
  function get(id) {
    const set = sets[id];
    if (!set) throw new Error('Unavailable sprite set: ' + id);
    const prepared = {};
    function frame(clipName, ticks, flipX) {
      const clip = set.animations[clipName];
      if (!clip) throw new Error('Unavailable animation: ' + id + '/' + clipName);
      let duration = 0;
      for (const s of clip.steps) duration += s.durationTicks;
      let t = Math.max(0, Number.isFinite(ticks) ? ticks : 0);
      t = clip.loop ? t % duration : Math.min(t, duration - 0.000001);
      let index = 0;
      for (; index < clip.steps.length - 1; index++) {
        if (t < clip.steps[index].durationTicks) break;
        t -= clip.steps[index].durationTicks;
      }
      const flip = !!flipX !== !!clip.flipX;
      const key = clipName + '/' + index + '/' + flip;
      if (!prepared[key]) {
        const step = clip.steps[index], source = set.frames[step.frame];
        const width = source.pixels[0].length;
        const relative = /(?:feet|anchor)[ -](?:relative|origin)|relative to (?:the )?(?:feet|anchor)/i.test(set.coordinates);
        const local = !relative && /frame-local|image top-left/i.test(set.coordinates);
        const boxes = bs => bs.map(b => ({...b, x: flip ? (local ? width - b.x - (b.shape === 'circle' ? 0 : b.w) : -b.x - (b.shape === 'circle' ? 0 : b.w)) : b.x}));
        prepared[key] = {pixels:source.pixels, palette:source.palette, ...(source.layers ? {layers:source.layers} : {}), anchor:{x:flip ? width-step.anchor.x : step.anchor.x,y:step.anchor.y}, ...(step.projectileOrigin ? {projectileOrigin:{x:flip ? width-step.projectileOrigin.x : step.projectileOrigin.x,y:step.projectileOrigin.y}} : {}), hitboxes:boxes(step.hitboxes), hurtboxes:boxes(step.hurtboxes), flipX:flip};
      }
      return prepared[key];
    }
    function character() {
      const fail = reason => { throw new Error('Sprite set is not fighter-compatible: ' + id + ': ' + reason); };
      if (set.camera === 'top-down' || !/(?:feet|anchor)[ -](?:relative|origin)|relative to (?:the )?(?:feet|anchor)/i.test(set.coordinates)) fail('requires feet/anchor-relative geometry');
      const required = ['idle','walk','jump','crouch','light','airLight','airHeavy','heavy','sweep','special','dash','guard','crouchGuard','hurt','ko','victory'];
      const moves = ['light','airLight','airHeavy','heavy','sweep','special','dash'];
      for (const name of required) if (!set.animations[name]) fail('missing clip ' + name);
      const animations = {};
      for (const [name, clip] of Object.entries(set.animations)) {
        if (clip.flipX) fail('pre-mirrored clip ' + name);
        if (moves.includes(name) && clip.steps.length < 3) fail('clip needs startup, active and recovery: ' + name);
        animations[name] = {loop:clip.loop, frames:clip.steps.map(step => {
          if (!Number.isInteger(step.durationTicks) || step.durationTicks < 1) fail('integer timing required: ' + name);
          for (const box of [...step.hitboxes,...step.hurtboxes]) if (box.shape === 'circle' || !Number.isFinite(box.w) || !Number.isFinite(box.h)) fail('rectangle geometry required: ' + name);
          const {durationTicks, ...metadata} = step;
          return {...metadata, duration:durationTicks};
        })};
      }
      const frames = Object.fromEntries(Object.entries(set.frames).map(([name, source]) => [name, {...source, size:{w:source.pixels[0].length,h:source.pixels.length}}]));
      return JSON.parse(JSON.stringify({frames,animations,...(set.projectile ? {projectile:set.projectile} : {})}));
    }
    return {frames:set.frames, animations:set.animations, coordinates:set.coordinates,
      ...(set.projectile ? {projectile:set.projectile} : {}), character,
      unsupportedStates:set.unsupportedStates, frame,
      draw(api, clip, ticks, x, y, flipX) {
        const f = frame(clip,ticks,flipX);
        api.spr(f.pixels,Math.round(x-f.anchor.x),Math.round(y-f.anchor.y),f.flipX,false,f.palette);
        for (const layer of f.layers || []) api.spr(layer.pixels,Math.round(x-f.anchor.x),Math.round(y-f.anchor.y),f.flipX,false,layer.palette);
        return f;
      }};
  }
  return Object.freeze({get});
})`

export function linkSpriteAssets(sprites: SpriteRecord[]): string {
  const data = Object.fromEntries(
    sprites.map((s) => [
      s.id,
      {
        frames: s.frames,
        animations: s.animations,
        ...(s.projectile ? { projectile: s.projectile } : {}),
        camera: s.camera,
        coordinates: s.coordinates,
        unsupportedStates: s.unsupportedStates,
      },
    ]),
  )
  return `const ART = ${ART_RUNTIME}(${JSON.stringify(data)});`
}
