import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { z } from 'zod'
import { type CatalogPart, digest, openCatalogDb } from './catalog.ts'
import { ROOT } from './env.ts'

const point = z.object({ x: z.number().finite(), y: z.number().finite() })
const canonicalBox = point
  .extend({
    shape: z.enum(['rect', 'circle']).optional(),
    w: z.number().positive().optional(),
    h: z.number().positive().optional(),
    radius: z.number().positive().optional(),
  })
  .passthrough()
  .superRefine((shape, ctx) => {
    if (
      shape.kind === 'circle' &&
      (shape.shape !== 'circle' || (shape.r !== undefined && shape.r !== shape.radius))
    )
      ctx.addIssue({ code: 'custom', message: 'Conflicting circle geometry aliases' })
    if (shape.shape === 'circle' ? !shape.radius : !shape.w || !shape.h)
      ctx.addIssue({
        code: 'custom',
        message: 'Collision geometry requires positive rectangle dimensions or a circle radius',
      })
  })
// Older authored sets use kind/r. Add canonical fields without discarding the
// original aliases or any game-specific geometry metadata.
const box = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw
  const value = raw as Record<string, unknown>
  if (value.kind !== 'circle') return raw
  return { ...value, shape: value.shape ?? 'circle', radius: value.radius ?? value.r }
}, canonicalBox)
const spritePixels = z.array(z.string().regex(/^[.0-9a-f]+$/i)).min(1)
const spritePalette = z
  .array(z.string().regex(/^#[0-9a-f]{6}$/i))
  .min(1)
  .max(16)
// Extra layers share the frame canvas/anchor. Reject offsets rather than silently
// dropping them: every color plane must undergo exactly the same mirror/placement.
const layerSchema = z.object({ pixels: spritePixels, palette: spritePalette }).strict()
const frameSchema = z
  .object({
    id: z.string().optional(),
    pixels: spritePixels,
    palette: spritePalette.optional(),
    layers: z.array(layerSchema).max(8).optional(),
    anchor: point,
    durationTicks: z.number().positive().optional(),
    durationMs: z.number().positive().optional(),
    hitboxes: z.array(box).default([]),
    hurtboxes: z.array(box).default([]),
  })
  .passthrough()
const stepSchema = z
  .object({
    frame: z.string(),
    duration: z.number().positive(),
    anchor: point.optional(),
    // A socket is always a point on the unmirrored frame canvas, independent of
    // the collision-box coordinate convention used by this sprite set.
    projectileOrigin: point.strict().optional(),
    hitboxes: z.array(box).default([]),
    hurtboxes: z.array(box).default([]),
  })
  .passthrough()
const projectileSchema = z
  .object({
    travel: z.string().min(1),
    impact: z.string().min(1).optional(),
    bind: z.string().min(1).optional(),
    speed: z.number().finite().positive().max(8),
    life: z.number().int().min(1).max(180),
    box: z
      .object({
        x: z.number().finite().min(-64).max(64),
        y: z.number().finite().min(-64).max(64),
        w: z.number().finite().positive().max(64),
        h: z.number().finite().positive().max(64),
      })
      .strict(),
    bindTicks: z.number().int().min(1).max(90).optional(),
  })
  .strict()
  .superRefine((projectile, ctx) => {
    if ((projectile.bind !== undefined) !== (projectile.bindTicks !== undefined))
      ctx.addIssue({
        code: 'custom',
        message: 'Projectile bind requires both a clip and bindTicks',
      })
  })
const clipSchema = z
  .object({
    frames: z.union([z.array(z.string()), z.array(stepSchema)]).optional(),
    frameIds: z.array(z.string()).optional(),
    loop: z.boolean(),
    frameMs: z.number().positive().optional(),
    flipX: z.boolean().default(false),
  })
  .passthrough()

export interface SpriteRecord {
  id: string
  packId: string
  subject: string
  sourcePath: string
  hash: string
  status: 'draft' | 'verified' | 'source-checked'
  camera: string
  tags: string[]
  frames: Record<string, z.infer<typeof frameSchema>>
  animations: Record<
    string,
    {
      loop: boolean
      flipX: boolean
      steps: {
        frame: string
        durationTicks: number
        anchor: { x: number; y: number }
        projectileOrigin?: { x: number; y: number }
        hitboxes: z.infer<typeof box>[]
        hurtboxes: z.infer<typeof box>[]
      }[]
    }
  >
  projectile?: z.infer<typeof projectileSchema>
  /** Geometry is preserved in its authored coordinate system, never silently reinterpreted. */
  coordinates: string
  provenance: unknown
  license: unknown
  unsupportedStates: string[]
}

export function normalizeSpriteSet(
  raw: unknown,
  opts: {
    packId: string
    sourcePath: string
    status?: SpriteRecord['status']
    coordinates?: string
    provenance?: unknown
    license?: unknown
    camera?: string
    tags?: string[]
  },
): SpriteRecord {
  const input = z
    .object({
      id: z.string(),
      subject: z.string().optional(),
      frames: z.union([z.array(frameSchema), z.record(z.string(), frameSchema)]),
      animations: z.record(z.string(), clipSchema),
      projectile: projectileSchema.optional(),
      unsupportedStates: z.array(z.string()).default([]),
      coordinates: z.string().optional(),
      coordinateSystem: z.string().optional(),
      geometry: z.object({ coordinates: z.string() }).passthrough().optional(),
      camera: z.string().optional(),
      tags: z.array(z.string()).optional(),
      provenance: z.unknown().optional(),
      license: z.unknown().optional(),
    })
    .passthrough()
    .parse(raw)
  const frames = Array.isArray(input.frames)
    ? Object.fromEntries(input.frames.map((f, i) => [f.id ?? String(i), f]))
    : input.frames
  for (const [id, frame] of Object.entries(frames)) {
    const width = frame.pixels[0]!.length
    if (!width || frame.pixels.some((row) => row.length !== width))
      throw new Error(`Nonrectangular sprite ${input.id}/${id}`)
    if (width > 256 || frame.pixels.length > 224)
      throw new Error(`Sprite exceeds screen: ${input.id}/${id}`)
    for (const [index, layer] of [frame, ...(frame.layers ?? [])].entries()) {
      if (
        layer.pixels.length !== frame.pixels.length ||
        layer.pixels.some((row) => row.length !== width)
      )
        throw new Error(`Sprite layer canvas mismatch: ${input.id}/${id}/${index}`)
      if (
        layer.palette &&
        layer.pixels.some((row) =>
          [...row].some(
            (pixel) => pixel !== '.' && Number.parseInt(pixel, 16) >= layer.palette!.length,
          ),
        )
      )
        throw new Error(`Sprite palette index out of range: ${input.id}/${id}/${index}`)
    }
  }
  const animations: SpriteRecord['animations'] = {}
  for (const [name, clip] of Object.entries(input.animations)) {
    const items = clip.frames ?? clip.frameIds ?? []
    if (!items.length) throw new Error(`Empty animation ${input.id}/${name}`)
    animations[name] = {
      loop: clip.loop,
      flipX: clip.flipX,
      steps: items.map((item) => {
        const id = typeof item === 'string' ? item : item.frame
        const frame = frames[id]
        if (!frame) throw new Error(`Missing sprite frame ${input.id}/${id}`)
        const step = typeof item === 'string' ? null : item
        if (
          step?.projectileOrigin &&
          (step.projectileOrigin.x < 0 ||
            step.projectileOrigin.y < 0 ||
            step.projectileOrigin.x >= frame.pixels[0]!.length ||
            step.projectileOrigin.y >= frame.pixels.length)
        )
          throw new Error(`Projectile origin outside sprite canvas: ${input.id}/${name}/${id}`)
        const duration =
          step?.duration ??
          (clip.frameMs
            ? (clip.frameMs * 60) / 1000
            : (frame.durationTicks ?? (frame.durationMs ? (frame.durationMs * 60) / 1000 : null)))
        if (duration === null) throw new Error(`Missing frame timing ${input.id}/${name}/${id}`)
        return {
          frame: id,
          durationTicks: duration,
          anchor: step?.anchor ?? frame.anchor,
          ...(step?.projectileOrigin ? { projectileOrigin: step.projectileOrigin } : {}),
          hitboxes: step?.hitboxes ?? frame.hitboxes,
          hurtboxes: step?.hurtboxes ?? frame.hurtboxes,
        }
      }),
    }
  }
  if (input.projectile) {
    for (const [field, loop] of [
      ['travel', true],
      ['impact', false],
      ['bind', undefined],
    ] as const) {
      const name = input.projectile[field]
      if (name === undefined) continue
      const clip = animations[name]
      if (!clip || (loop !== undefined && clip.loop !== loop))
        throw new Error(`Invalid projectile ${field} clip: ${input.id}/${name}`)
    }
    if (!animations.special?.steps[1]?.projectileOrigin)
      throw new Error(`Projectile requires an active special-step origin: ${input.id}`)
  }
  return {
    id: `${opts.packId}/${input.id}`,
    packId: opts.packId,
    subject: input.subject ?? input.id,
    sourcePath: opts.sourcePath,
    hash: digest(JSON.stringify(raw)),
    status: opts.status ?? 'draft',
    camera: input.camera ?? opts.camera ?? 'unspecified',
    tags: input.tags ?? opts.tags ?? [],
    frames,
    animations,
    ...(input.projectile ? { projectile: input.projectile } : {}),
    coordinates:
      input.coordinates ??
      input.coordinateSystem ??
      input.geometry?.coordinates ??
      opts.coordinates ??
      'image top-left; anchor identifies placement origin',
    provenance: input.provenance ?? opts.provenance,
    license: input.license ?? opts.license,
    unsupportedStates: input.unsupportedStates,
  }
}

/** Handles current original foundation sheets and separately imported, licensed actor packs. */
export function loadSpriteCatalog(
  parts: CatalogPart[],
  assetDir: string | string[] = [
    resolve(ROOT, 'library/assets'),
    resolve(ROOT, 'data/local-assets'),
  ],
  issues: { id: string; message: string }[] = [],
): SpriteRecord[] {
  const sprites: SpriteRecord[] = []
  for (const part of parts)
    for (const path of part.manifest.assets) {
      try {
        const file = resolve(part.dir, path)
        const raw = JSON.parse(readFileSync(file, 'utf8'))
        const sets =
          raw.characters ??
          raw.sets ??
          (raw.hero
            ? { [raw.hero.id ?? 'hero']: raw.hero, ...raw.objects }
            : { [raw.id ?? part.manifest.id]: raw })
        for (const [id, set] of Object.entries(sets))
          sprites.push(
            normalizeSpriteSet(
              { id, ...(set as object) },
              {
                packId: part.manifest.id,
                sourcePath: relative(ROOT, file),
                status: part.status,
                coordinates: raw.coordinates ?? raw.coordinateSystem,
                // The fighter contract is explicitly side-view. Older original
                // sheets predate camera metadata; do not offer them for top-down play.
                camera: raw.camera ?? (part.manifest.entry === 'fighter' ? 'side-view' : undefined),
                provenance: raw.provenance ?? part.manifest.provenance,
                license: raw.license ?? part.manifest.license,
              },
            ),
          )
      } catch (error) {
        issues.push({
          id: `${part.manifest.id}/${path}`,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  // An explicit root (or roots) is isolated; only the default includes private
  // local imports. Both locations use the same provenance/evidence admission.
  for (const root of typeof assetDir === 'string' ? [assetDir] : assetDir) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = resolve(root, entry.name)
      if (!existsSync(resolve(dir, 'manifest.json'))) continue
      try {
        const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'))
        const status = assetAdmission(dir, manifest) ? 'source-checked' : 'draft'
        for (const actor of manifest.actors ?? []) {
          const file = resolve(dir, actor.file)
          if (!file.startsWith(`${dir}/`)) throw new Error('Actor path escapes asset pack')
          const raw = JSON.parse(readFileSync(file, 'utf8'))
          sprites.push(
            normalizeSpriteSet(raw, {
              packId: manifest.id,
              sourcePath: relative(ROOT, file),
              status,
              coordinates: raw.coordinates,
              provenance: {
                ...manifest.provenance,
                actor: raw.provenance,
                source: raw.source,
                geometry: raw.geometry,
                normalization: raw.normalization,
              },
              license: manifest.license,
              camera: manifest.camera,
              tags: actor.tags,
            }),
          )
        }
        for (const prop of manifest.props ?? []) {
          const file = resolve(dir, prop.file)
          if (!file.startsWith(`${dir}/`)) throw new Error('Prop path escapes asset pack')
          const raw = JSON.parse(readFileSync(file, 'utf8'))
          sprites.push(
            normalizeSpriteSet(
              {
                ...raw,
                frames: { static: { ...raw, durationTicks: 1 } },
                animations: { static: { frames: ['static'], loop: true } },
                tags: [
                  raw.id.replace(/-(held|item)$/, '').replaceAll('-', ' '),
                  ...(raw.tags ?? []),
                ],
                unsupportedStates: ['animated-motion', 'attack-cycle', 'destruction-cycle'],
              },
              {
                packId: manifest.id,
                sourcePath: relative(ROOT, file),
                status,
                camera: manifest.camera,
                coordinates: 'frame-local pixels; subtract anchor to obtain world-relative offsets',
                provenance: {
                  ...manifest.provenance,
                  source: raw.source,
                  anchorOrigin: raw.anchorOrigin,
                },
                license: manifest.license,
              },
            ),
          )
        }
      } catch (error) {
        issues.push({
          id: entry.name,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
  const counts = new Map<string, number>()
  for (const sprite of sprites) counts.set(sprite.id, (counts.get(sprite.id) ?? 0) + 1)
  const duplicates = new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id))
  for (const id of duplicates)
    issues.push({ id, message: 'Duplicate sprite ID; all conflicting entries omitted' })
  return sprites.filter((sprite) => !duplicates.has(sprite.id))
}

/** Includes normalized art, original source bytes and the local license notice. */
export function assetPackHash(
  dir: string,
  manifest: {
    actors?: { file: string }[]
    props?: { file: string }[]
    license?: { localNotice?: string }
  },
) {
  const paths = new Set(['manifest.json'])
  if (manifest.license?.localNotice) paths.add(manifest.license.localNotice)
  for (const item of [...(manifest.actors ?? []), ...(manifest.props ?? [])]) {
    paths.add(item.file)
    const file = resolve(dir, item.file)
    if (!file.startsWith(`${resolve(dir)}${sep}`)) throw new Error('Asset path escapes pack')
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (raw.source?.path) paths.add(raw.source.path)
  }
  return digest(
    [...paths]
      .sort()
      .map((path) => {
        const file = resolve(dir, path)
        if (!file.startsWith(`${resolve(dir)}${sep}`)) throw new Error('Asset path escapes pack')
        return `${path}\n${readFileSync(file, 'base64')}`
      })
      .join('\n'),
  )
}

function assetAdmission(dir: string, manifest: Parameters<typeof assetPackHash>[1]): boolean {
  const file = resolve(dir, 'quality.json')
  if (!existsSync(file)) return false
  const report = JSON.parse(readFileSync(file, 'utf8'))
  if (report.contentHash !== assetPackHash(dir, manifest)) return false
  return ['integrity', 'visual', 'provenance'].every((name) =>
    report.checks?.some(
      (check: { name: string; passed: boolean; artifact: string; artifactHash: string }) => {
        if (check.name !== name || !check.passed) return false
        const artifact = resolve(dir, check.artifact)
        return (
          artifact.startsWith(`${resolve(dir)}${sep}`) &&
          existsSync(artifact) &&
          digest(readFileSync(artifact, 'utf8')) === check.artifactHash
        )
      },
    ),
  )
}

export function indexSprites(sprites: SpriteRecord[], dbPath?: string) {
  const db = openCatalogDb(dbPath)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS sprite_sets (
      id TEXT PRIMARY KEY, pack_id TEXT NOT NULL, content_hash TEXT NOT NULL,
      status TEXT NOT NULL, source_path TEXT NOT NULL, metadata_json TEXT NOT NULL
    ); BEGIN IMMEDIATE; DELETE FROM sprite_sets;`)
    const insert = db.prepare('INSERT INTO sprite_sets VALUES (?, ?, ?, ?, ?, ?)')
    for (const sprite of sprites)
      insert.run(
        sprite.id,
        sprite.packId,
        sprite.hash,
        sprite.status,
        sprite.sourcePath,
        JSON.stringify(sprite),
      )
    db.exec('COMMIT')
    return sprites.map((sprite) => ({
      id: sprite.id,
      frames: Object.keys(sprite.frames).length,
      animations: Object.keys(sprite.animations),
      status: sprite.status,
    }))
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}
