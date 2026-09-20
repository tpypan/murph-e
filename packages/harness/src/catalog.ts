import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Script } from 'node:vm'
import { z } from 'zod'
import { ensureAudioTables, indexSoundBank } from './audio-catalog.ts'
import { ROOT } from './env.ts'
import { normalized, requestClauses } from './request-text.ts'
import { loadSpriteCatalog, type SpriteRecord } from './sprite-catalog.ts'
import { linkSpriteAssets, selectSpriteAssets, spriteContract } from './sprite-link.ts'

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/)
export const CatalogManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifier,
    version: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string()).min(1),
    supportsPlayers: z.array(z.union([z.literal(1), z.literal(2)])).min(1),
    module: z.string().default('module.js'),
    entry: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    apiVersion: z.literal(1),
    license: z.object({ spdx: z.string().min(1), notes: z.string().default('') }),
    provenance: z.object({
      kind: z.enum(['original', 'licensed', 'derived']),
      authors: z.array(z.string()).min(1),
      sources: z.array(z.string()),
      createdAt: z.string(),
    }),
    match: z
      .object({
        phrases: z.array(z.string()),
        genres: z.array(z.string()),
        // A named adaptation can win an equally relevant match, never an unrelated one.
        priority: z.number().int().min(0).max(10).default(0),
        requirePhrase: z.boolean().default(false),
      })
      .optional(),
    // Additional referenced files become part of the immutable content hash.
    files: z.array(z.string()).default([]),
    assets: z.array(z.string()).default([]),
  })
  .passthrough()
export type CatalogManifest = z.infer<typeof CatalogManifestSchema>

export interface CatalogPart {
  manifest: CatalogManifest
  dir: string
  hash: string
  module: string
  api: string
  status: 'draft' | 'verified'
  checks: string[]
}

export interface CatalogContext {
  parts: CatalogPart[]
  sprites?: SpriteRecord[]
  text: string
  hash: string
}

export const CATALOG_DIR = resolve(ROOT, 'library/catalog')
export const LOCAL_CATALOG_DIR = resolve(ROOT, 'data/local-catalog')
export const CATALOG_DB = resolve(ROOT, 'data/catalog.sqlite')
export const digest = (text: string) => createHash('sha256').update(text).digest('hex')

function inside(dir: string, file: string): string {
  const path = resolve(dir, file)
  if (!path.startsWith(`${resolve(dir)}${sep}`))
    throw new Error(`Catalog path escapes pack: ${file}`)
  if (existsSync(path)) {
    if (!realpathSync(path).startsWith(`${realpathSync(dir)}${sep}`))
      throw new Error(`Catalog symlink escapes pack: ${file}`)
    if (!statSync(path).isFile()) throw new Error(`Catalog path is not a file: ${file}`)
  }
  return path
}

function verification(dir: string, hash: string, players: number[]): string[] {
  const file = inside(dir, 'quality.json')
  if (!existsSync(file)) return []
  const data = JSON.parse(readFileSync(file, 'utf8')) as {
    contentHash?: string
    checks?: { name: string; passed: boolean; artifact: string; artifactHash: string }[]
  }
  if (data.contentHash !== hash || !Array.isArray(data.checks)) return []
  const required = ['behavior', 'visual', ...players.map((p) => `runtime-${p}p`)]
  const passed = data.checks
    .filter((check) => {
      if (!check.passed || !check.artifact || !check.artifactHash) return false
      const path = inside(dir, check.artifact)
      return existsSync(path) && digest(readFileSync(path, 'utf8')) === check.artifactHash
    })
    .map((check) => check.name)
  return required.every((name) => passed.includes(name)) ? passed : []
}

/** Default discovery includes private local packs; an explicit directory stays isolated. */
export function loadCatalog(
  dir?: string,
  issues: { id: string; message: string }[] = [],
): CatalogPart[] {
  return readCatalogRoots(
    dir === undefined ? [CATALOG_DIR, LOCAL_CATALOG_DIR] : [dir],
    issues,
    dir === undefined ? ROOT : undefined,
  )
}

/** Isolated root composition for tooling/tests; no indexing or admission writes occur. */
export function loadCatalogRoots(
  roots: readonly string[],
  issues: { id: string; message: string }[] = [],
): CatalogPart[] {
  return readCatalogRoots(roots, issues)
}

/** Readable files are authoritative; editing any shipped part invalidates admission. */
function readCatalogRoots(
  roots: readonly string[],
  issues: { id: string; message: string }[],
  boundary?: string,
): CatalogPart[] {
  const candidates: { id: string; dir: string; symlink: boolean }[] = []
  for (const root of new Set(roots.map((dir) => resolve(dir)))) {
    if (!existsSync(root)) continue
    try {
      if (lstatSync(root).isSymbolicLink()) throw new Error(`Catalog root is a symlink: ${root}`)
      if (boundary && !realpathSync(root).startsWith(`${realpathSync(boundary)}${sep}`))
        throw new Error(`Catalog root escapes project: ${root}`)
      for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
        const dir = resolve(root, entry.name)
        if (!existsSync(resolve(dir, 'manifest.json'))) continue
        candidates.push({ id: entry.name, dir, symlink: entry.isSymbolicLink() })
      }
    } catch (error) {
      issues.push({ id: root, message: error instanceof Error ? error.message : String(error) })
    }
  }
  const claims = new Map<string, string[]>()
  for (const candidate of candidates)
    claims.set(candidate.id, [...(claims.get(candidate.id) ?? []), candidate.dir])
  const duplicates = new Set([...claims].filter(([, dirs]) => dirs.length > 1).map(([id]) => id))
  for (const id of duplicates)
    issues.push({
      id,
      message: `Duplicate catalog id ${id}; excluded all packs: ${claims.get(id)!.join(', ')}`,
    })
  return candidates
    .filter((candidate) => !duplicates.has(candidate.id))
    .flatMap((candidate) => {
      try {
        const pack = candidate.dir
        if (candidate.symlink) throw new Error(`Catalog pack is a symlink: ${pack}`)
        const manifestPath = inside(pack, 'manifest.json')
        const manifestText = readFileSync(manifestPath, 'utf8')
        const manifest = CatalogManifestSchema.parse(JSON.parse(manifestText))
        if (manifest.id !== candidate.id)
          throw new Error(`Catalog id/directory mismatch: ${candidate.id}`)
        const module = readFileSync(inside(pack, manifest.module), 'utf8')
          .trim()
          .replace(/;\s*$/, '')
        new Script(`const factory = (${module});`, { filename: `${manifest.id}/module.js` })
        const api = readFileSync(inside(pack, 'api.md'), 'utf8')
        const extra = [...new Set([...manifest.files, ...manifest.assets])]
          .sort()
          .map((file) => `${file}\n${readFileSync(inside(pack, file), 'base64')}`)
        const hash = digest([manifestText, module, api, ...extra].join('\n'))
        const checks = verification(pack, hash, manifest.supportsPlayers)
        return [
          {
            manifest,
            dir: pack,
            module,
            api,
            hash,
            checks,
            status: checks.length ? ('verified' as const) : ('draft' as const),
          },
        ]
      } catch (error) {
        // A new or broken pack cannot take unrelated game generation offline.
        // It remains unavailable until its complete contract validates.
        issues.push({
          id: candidate.id,
          message: error instanceof Error ? error.message : String(error),
        })
        return []
      }
    })
}

const genreAliases: Record<string, readonly string[]> = {
  crossing: ['traffic crossing', 'frog crossing', 'lane crossing'],
  pong: [
    'ball paddle duel',
    'paddle ball duel',
    'paddle and ball duel',
    'paddle tennis',
    'table tennis',
  ],
  breakout: ['brick breaking', 'paddle brick breaker', 'ball and paddle brick breaker'],
  speedPlatformer: [
    'momentum platformer',
    'momentum platforming',
    'speed platforming',
    'high speed platformer',
  ],
}

function mechanicSignals(text: string): Record<string, string[]> {
  const signals: Record<string, string[]> = {
    crossing: [],
    pong: [],
    breakout: [],
    speedPlatformer: [],
    kart: [],
  }
  for (const clause of text.split(' ; ')) {
    if (
      /\b(?:race|races|racing|ride|rides|riding|drive|drives|driving)\b.{0,32}\b(?:karts?|go karts?)\b/.test(
        clause,
      ) ||
      /\b(?:karts?|go karts?)\b.{0,32}\b(?:race|races|racing|circuit|drift|drifting)\b/.test(clause)
    )
      signals.kart!.push('mechanics:ride or race karts')
    const frogTraffic =
      /\bfrogs?\b.{0,80}\b(?:dodg(?:e|es|ing)|avoid(?:s|ing)?)\b.{0,32}\b(?:cars?|traffic|vehicles?)\b/.test(
        clause,
      ) ||
      /\b(?:dodg(?:e|es|ing)|avoid(?:s|ing)?)\b.{0,32}\b(?:cars?|traffic|vehicles?)\b.{0,48}\b(?:as|with|are|is)\b.{0,16}\bfrogs?\b/.test(
        clause,
      )
    if (frogTraffic) signals.crossing!.push('mechanics:frog avoids moving traffic')
    if (
      /\b(?:roll(?:ing)?|spin dash|spindash|momentum)\b/.test(clause) &&
      /\b(?:slopes?|loops?|platforms?|rings?)\b/.test(clause)
    )
      signals.speedPlatformer!.push('mechanics:momentum platforming')
    if (
      /\b(?:cross(?:es|ing)?|hop(?:s|ping)?)\b.{0,32}\b(?:roads?|traffic|highways?|rivers?)\b/.test(
        clause,
      )
    )
      signals.crossing!.push('mechanics:cross road or river')
    const paddle = /\bpaddles?\b/.test(clause),
      ball = /\bballs?\b/.test(clause)
    if (
      paddle &&
      ball &&
      !/\b(?:bricks?|blocks?)\b/.test(clause) &&
      /\b(?:rall(?:y|ies)|volley|returns?|back and forth|opponent)\b/.test(clause)
    )
      signals.pong!.push('mechanics:paddle and ball rally')
    if (
      paddle &&
      ball &&
      /\b(?:bricks?|blocks?)\b/.test(clause) &&
      /\b(?:break(?:s|ing)?|destroy(?:s|ing)?|smash(?:es|ing)?|hit(?:s|ting)?|clear(?:s|ing)?)\b/.test(
        clause,
      )
    )
      signals.breakout!.push('mechanics:paddle ball breaks bricks')
  }
  return signals
}

function incompatibleMechanics(family: string, positive: string, negative: string): string[] {
  const reasons: string[] = []
  const excludesCore: Record<string, RegExp> = {
    crossing: /\b(?:cars?|traffic|roads?|hopping|crossing)\b/,
    pong: /\b(?:paddles?|balls?|rall(?:y|ies))\b/,
    breakout: /\b(?:paddles?|balls?|bricks?|blocks?)\b/,
    speedPlatformer: /\b(?:momentum|platforms?|jumping|rolling)\b/,
  }
  if (excludesCore[family]?.test(negative)) reasons.push('request removes a required core mechanic')
  const unsupported: Record<string, RegExp> = {
    crossing:
      /\b(?:tongues?|catch(?:es|ing)?\s+(?:the\s+)?flies|eat(?:s|ing)?\s+(?:the\s+)?flies|maze|endless runner|drive|driving|shoot(?:s|ing)?|guns?|bullets?)\b/,
    pong: /\b(?:boats?|rivers?|bricks?|block breaking|shoot(?:s|ing)?|guns?|bullets?|co op|cooperative|same side)\b/,
    breakout:
      /\b(?:rotate|rotating|falling blocks|shoot(?:s|ing)?|guns?|bullets?|exploding bricks)\b/,
    speedPlatformer:
      /\b(?:turn based|turnbased|top down|three dimensional|3d|fighting game|fighter|kart|racing cars)\b/,
  }
  if (unsupported[family]?.test(positive))
    reasons.push('request includes mechanics outside this foundation contract')
  return reasons
}

export interface CatalogMatchEvidence {
  part: CatalogPart
  score: number
  signals: string[]
  excluded: string[]
}

/** Deterministic retrieval evidence. No engine, spec, or request mutation and no network. */
export function catalogMatchEvidence(
  transcript: string,
  spec: { genre?: string; players?: number; moderated?: boolean },
  parts: CatalogPart[],
): CatalogMatchEvidence[] {
  // A moderated request can still use its sanitized genre; never recover its original words.
  const clauses = requestClauses(spec.moderated ? '' : transcript)
  const text = normalized(clauses.positive)
  const genre = normalized(spec.genre ?? '').trim()
  const aliasGenre = genre
    .replace(/^(?:(?:arcade|sports|single player|two player|competitive|cooperative)\s+)+/, '')
    .replace(/\s+(?:game|action)$/, '')
  const mechanics = mechanicSignals(clauses.positive)
  const rows = parts.map((part): CatalogMatchEvidence => {
    const family = part.manifest.entry
    const phrases = part.manifest.match?.phrases ?? part.manifest.tags
    const matched = phrases.filter((phrase) => text.includes(normalized(phrase)))
    const phraseScore = matched.reduce(
      (best, phrase) => Math.max(best, 10 + normalized(phrase).trim().split(' ').length),
      0,
    )
    const genres = part.manifest.match?.genres ?? part.manifest.tags
    const exactGenre = genres.some((g) => normalized(g).trim() === genre)
    const alias = genreAliases[family]?.includes(aliasGenre) ?? false
    const signals = [
      ...matched.map((phrase) => {
        // A pair of characters is a useful fallback for an otherwise vague
        // request, not evidence of fighting when they are explicitly driving,
        // playing Pong, etc. Keep actual combat/duel names as strong signals.
        const charactersOnly =
          family === 'fighter' &&
          /\b(?:and|versus|vs)\b/.test(normalized(phrase)) &&
          !/\b(?:fight|fighter|fighting|combat|duel|brawl)\b/.test(normalized(phrase))
        return `${charactersOnly ? 'theme' : 'phrase'}:${phrase}`
      }),
      ...(exactGenre ? [`genre:${genre}`] : alias ? [`genre-alias:${aliasGenre}`] : []),
      ...(mechanics[family] ?? []),
    ]
    const excluded = incompatibleMechanics(family, clauses.positive, clauses.negative)
    if (part.status !== 'verified') excluded.push('foundation is not verified')
    if (!part.manifest.supportsPlayers.includes(spec.players === 2 ? 2 : 1))
      excluded.push('unsupported player count')
    if (part.manifest.match?.requirePhrase && !phraseScore)
      excluded.push('named foundation requires its positive phrase')
    if (
      !phraseScore &&
      phrases.some((phrase) => normalized(clauses.negative).includes(normalized(phrase)))
    )
      excluded.push('foundation phrase is explicitly negated')
    const score =
      Math.max(phraseScore, mechanics[family]?.length ? 8 : 0) + (exactGenre ? 5 : alias ? 4 : 0)
    return { part, score, signals: [...new Set(signals)], excluded }
  })
  // Two recognized core loops need composition; choosing one would silently erase the other.
  const families = new Set(
    rows
      .filter(
        (row) =>
          row.part.status === 'verified' &&
          row.part.manifest.supportsPlayers.includes(spec.players === 2 ? 2 : 1) &&
          row.signals.some(
            (signal) => signal.startsWith('phrase:') || signal.startsWith('mechanics:'),
          ),
      )
      .map((row) => row.part.manifest.entry),
  )
  if (families.size > 1)
    for (const row of rows) row.excluded.push('request combines multiple foundation mechanics')
  else if (families.size === 1)
    for (const row of rows)
      if (!families.has(row.part.manifest.entry))
        row.excluded.push('genre conflicts with explicit request mechanics')
  return rows
    .map((row) => ({ ...row, score: row.excluded.length ? 0 : row.score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.part.manifest.match?.priority ?? 0) - (a.part.manifest.match?.priority ?? 0) ||
        a.part.manifest.id.localeCompare(b.part.manifest.id),
    )
}

/** Select one compatible foundation, never force unrelated prompts into a genre. */
export function catalogContext(
  transcript: string,
  spec: { genre?: string; players?: number; moderated?: boolean },
  parts = loadCatalog(),
): CatalogContext {
  if (process.env.HTN_CATALOG === '0') return { parts: [], text: '', hash: '' }
  const ranked = catalogMatchEvidence(transcript, spec, parts).filter((row) => row.score > 0)
  const chosen = ranked.slice(0, 1).map((row) => row.part)
  const sprites = selectSpriteAssets(
    transcript,
    spec,
    loadSpriteCatalog(parts).filter(
      (sprite) => !chosen.some((part) => part.manifest.id === sprite.packId),
    ),
  )
  const artContract = spriteContract(sprites)
  if (!chosen.length)
    return { parts: [], sprites, text: artContract, hash: artContract ? digest(artContract) : '' }
  const contract = chosen
    .map((part) =>
      [
        `=== AVAILABLE TESTED FOUNDATION: ARCADE.${part.manifest.entry} ===`,
        `Version ${part.manifest.version}; content hash ${part.hash}.`,
        part.manifest.description,
        part.api,
      ].join('\n'),
    )
    .join('\n\n')
  const guidance = `These factories and their complete bundled artwork are available as ARCADE.<entry>(config). Their implementation is linked into your final single game.js automatically. Do not rewrite or print their source or sprite pixels. Use the documented configuration and hooks to preserve the user's requested identities and mechanics. Do not pass invented config keys: they will not implement a feature. If a requested change is not supported, implement the needed behavior/art with the ordinary API, or compose explicit documented hooks. The library is a starting point, never permission to ignore the request. Define top-level init(api), update(api, dt), draw(api) wrappers; create/reset the factory inside init. api.players is authoritative. No external imports/assets/network are needed. For any rule the user's transcript does not explicitly change, the foundation contract is authoritative over incidental planner wording: preserve its controls, reward ownership and amounts, lives, timeouts, and round/terminal behavior. Do not write hooks to undo those defaults merely to satisfy an invented spec detail. Use hooks for concrete requested additions, not unsolicited bonus systems or score rewrites. Preserve explicit requested departures even when they require new code. Return the actual control mapping when choosing controls in the spec.`
  return {
    parts: chosen,
    sprites,
    text: `${guidance}\n\n${contract}\n\n${artContract}`,
    hash: digest(contract + artContract),
  }
}

const BEGIN = '// <arcade-catalog-bundle>'
const END = '// </arcade-catalog-bundle>'

/** Strip only a prefix produced by this compiler, so repair edits customization. */
export function catalogSource(code: string): string {
  if (!code.startsWith(`${BEGIN}\n`)) return code
  const end = code.indexOf(`\n${END}\n`)
  if (end < 0) throw new Error('Incomplete catalog bundle')
  return code.slice(end + END.length + 2)
}

export function assembleCatalog(source: string, context?: CatalogContext): string {
  const code = catalogSource(source)
  const entries = new Set(
    [...code.matchAll(/\bARCADE\.([A-Za-z][A-Za-z0-9]*)\b/g)].map((m) => m[1]!),
  )
  const usesArt = /\bART\.get\s*\(/.test(code)
  if (!entries.size && !usesArt) return code
  const parts = context?.parts ?? []
  for (const entry of entries) {
    if (!parts.some((p) => p.manifest.entry === entry))
      throw new Error(`Unavailable catalog factory ARCADE.${entry}`)
  }
  const used = parts.filter((p) => entries.has(p.manifest.entry))
  const sprites = context?.sprites ?? []
  if (usesArt && !sprites.length) throw new Error('No catalog sprite assets available')
  for (const match of code.matchAll(/\bART\.get\s*\(\s*(['"])(.*?)\1\s*\)/g)) {
    if (!sprites.some((s) => s.id === match[2]))
      throw new Error(`Unavailable sprite set: ${match[2]}`)
  }
  const fields = used.map((p) => `${JSON.stringify(p.manifest.entry)}: (${p.module})`)
  return `${BEGIN}\n// ${used.map((p) => `${p.manifest.id}@${p.manifest.version} ${p.hash}`).join('; ')}\nconst ARCADE = Object.freeze({\n${fields.join(',\n')}\n});\n${usesArt ? linkSpriteAssets(sprites) + '\n' : ''}${END}\n${code}`
}

export function catalogSnapshot(context: CatalogContext) {
  return {
    hash: context.hash,
    text: context.text,
    parts: context.parts.map((p) => ({
      id: p.manifest.id,
      version: p.manifest.version,
      hash: p.hash,
      status: p.status,
    })),
    sprites: (context.sprites ?? []).map((s) => ({
      id: s.id,
      hash: s.hash,
      sourcePath: s.sourcePath,
      provenance: s.provenance,
      license: s.license,
    })),
  }
}

export function catalogPreview(context: CatalogContext): { prefix: string; demo: string } | null {
  const part = context.parts[0]
  const sprites = context.sprites ?? []
  if (!part && !sprites.length) return null
  const marker = [
    part ? `ARCADE.${part.manifest.entry}` : '',
    sprites.length ? `ART.get(${JSON.stringify(sprites[0]!.id)})` : '',
  ]
    .filter(Boolean)
    .join('; ')
  const bundled = assembleCatalog(marker, context)
  const spriteDemo = `let actors; function init(api) { actors = ${JSON.stringify(sprites.map((s) => ({ id: s.id, clip: Object.keys(s.animations).find((k) => k.startsWith('walk-')) ?? Object.keys(s.animations)[0] })))}.map(s => ({art:ART.get(s.id),clip:s.clip,scaled:new WeakMap()})); }
function update(api,dt) {}
function draw(api) { api.cls(0); actors.forEach((s,i) => { const f=s.art.frame(s.clip,api.frame); const size=3; const ox=(i+0.5)*256/actors.length-f.pixels[0].length*size/2,oy=112-f.pixels.length*size/2; for(const plane of [f,...(f.layers||[])]){if(plane.palette){let rows=s.scaled.get(plane.pixels);if(!rows){rows=plane.pixels.flatMap(row=>Array(size).fill([...row].map(p=>p.repeat(size)).join('')));s.scaled.set(plane.pixels,rows);}api.spr(rows,ox,oy,f.flipX,false,plane.palette);continue;} for(let y=0;y<plane.pixels.length;y++)for(let x=0;x<plane.pixels[y].length;x++){const p=plane.pixels[y][f.flipX?plane.pixels[y].length-1-x:x];if(p!=='.')api.rectfill(ox+x*size,oy+y*size,size,size,parseInt(p,16));}} }); }`
  return {
    prefix: bundled.slice(0, -marker.length),
    demo: part ? readFileSync(resolve(part.dir, 'demo.js'), 'utf8') : spriteDemo,
  }
}

/** SQLite is an index and history store, not the only copy of reusable source. */
export function openCatalogDb(path = CATALOG_DB): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path, { timeout: 3000 })
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS catalog_parts (
      id TEXT PRIMARY KEY, version TEXT NOT NULL, content_hash TEXT NOT NULL,
      status TEXT NOT NULL, manifest_json TEXT NOT NULL, source_path TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS generated_candidates (
      code_hash TEXT PRIMARY KEY, first_run_id TEXT NOT NULL, latest_run_id TEXT NOT NULL,
      title TEXT NOT NULL, genre TEXT NOT NULL, players INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'quarantined', source_path TEXT NOT NULL,
      spec_json TEXT NOT NULL, provenance_json TEXT NOT NULL, validation_json TEXT NOT NULL,
      occurrences INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidate_runs (
      run_id TEXT NOT NULL, code_hash TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, code_hash), FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash)
    );
    CREATE TABLE IF NOT EXISTS candidate_attempts (
      id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, run_id TEXT NOT NULL,
      stage TEXT NOT NULL, variant INTEGER NOT NULL, metadata_json TEXT NOT NULL,
      validation_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash)
    );
    CREATE INDEX IF NOT EXISTS attempts_code ON candidate_attempts(code_hash, run_id);
    CREATE TABLE IF NOT EXISTS candidate_validation_events (
      id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL, attempt_id TEXT,
      validation_json TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash),
      FOREIGN KEY(attempt_id) REFERENCES candidate_attempts(id)
    );
    CREATE INDEX IF NOT EXISTS candidates_genre ON generated_candidates(genre, players, status);
    PRAGMA user_version=1;`)
  ensureAudioTables(db)
  return db
}

export function indexCatalog(parts = loadCatalog(), path = CATALOG_DB) {
  const db = openCatalogDb(path)
  try {
    db.exec('BEGIN IMMEDIATE')
    indexSoundBank(db)
    db.exec('DELETE FROM catalog_parts')
    const insert = db.prepare('INSERT INTO catalog_parts VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const p of parts)
      insert.run(
        p.manifest.id,
        p.manifest.version,
        p.hash,
        p.status,
        JSON.stringify(p.manifest),
        relative(ROOT, p.dir),
        new Date().toISOString(),
      )
    db.exec('COMMIT')
    return parts.map((p) => ({ id: p.manifest.id, hash: p.hash, status: p.status }))
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

export type CandidateStage = 'build' | 'repair' | 'remix' | 'remix-repair'

export interface CandidateValidation {
  /** Null means validation has not finished, not a failed runtime test. */
  runtimePassed: boolean | null
  observations: string[]
  outcome?: 'pending' | 'passed' | 'failed' | 'error' | 'cancelled'
}

export interface CandidateInput {
  runId: string
  /** Stable slot within a run; replaying the same slot cannot rewrite its provenance. */
  attemptId?: string
  stage?: CandidateStage
  variant?: number
  code: string
  sourceCode?: string
  rawOutput?: string
  transcript: string
  spec: { title: string; genre: string; players: number }
  validation: CandidateValidation
  model: string
  effort: string
  parts?: { id: string; version: string; hash: string }[]
  sprites?: {
    id: string
    hash: string
    sourcePath: string
    provenance: unknown
    license: unknown
  }[]
}

export function candidateAttemptId(
  input: Pick<CandidateInput, 'runId' | 'attemptId' | 'stage' | 'variant' | 'code'>,
) {
  return digest(
    JSON.stringify([
      input.runId,
      input.attemptId ?? `${input.stage ?? 'build'}:${input.variant ?? 0}:${digest(input.code)}`,
    ]),
  )
}

export function recordCandidateValidation(
  code: string,
  validation: CandidateInput['validation'],
  dbPath = CATALOG_DB,
  attemptId?: string,
  storage = resolve(ROOT, 'data/catalog/candidates'),
) {
  const db = openCatalogDb(dbPath)
  try {
    const hash = digest(code)
    if (!db.prepare('SELECT code_hash FROM generated_candidates WHERE code_hash=?').get(hash))
      throw new Error(`Cannot validate an unarchived candidate: ${hash}`)
    if (
      attemptId &&
      !db
        .prepare('SELECT id FROM candidate_attempts WHERE id=? AND code_hash=?')
        .get(attemptId, hash)
    )
      throw new Error('Candidate validation does not match its archived attempt')
    const now = new Date().toISOString()
    const json = JSON.stringify(validation)
    db.exec('BEGIN IMMEDIATE')
    db.prepare(
      'UPDATE generated_candidates SET validation_json=?, updated_at=? WHERE code_hash=?',
    ).run(json, now, hash)
    if (attemptId)
      db.prepare('UPDATE candidate_attempts SET validation_json=?, updated_at=? WHERE id=?').run(
        json,
        now,
        attemptId,
      )
    const event = db
      .prepare(`INSERT INTO candidate_validation_events
      (code_hash, attempt_id, validation_json, created_at) VALUES (?, ?, ?, ?)`)
      .run(hash, attemptId ?? null, json, now)
    db.exec('COMMIT')
    const folder = resolve(storage, hash, 'validation')
    mkdirSync(folder, { recursive: true })
    writeFileSync(
      resolve(folder, `${event.lastInsertRowid}-${randomUUID()}.json`),
      JSON.stringify({ attemptId: attemptId ?? null, hash, at: now, validation }, null, 2),
    )
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

/** Persist every result for review. Runtime success alone cannot confer trust. */
export function archiveCandidate(
  input: CandidateInput,
  dbPath = CATALOG_DB,
  storage = resolve(ROOT, 'data/catalog/candidates'),
): string {
  const hash = digest(input.code)
  const attemptId = candidateAttemptId(input)
  const dir = resolve(storage, hash)
  mkdirSync(dir, { recursive: true })
  if (!existsSync(resolve(dir, 'game.js'))) writeFileSync(resolve(dir, 'game.js'), input.code)
  if (!existsSync(resolve(dir, 'candidate.json')))
    writeFileSync(
      resolve(dir, 'candidate.json'),
      JSON.stringify(
        {
          ...input,
          code: undefined,
          hash,
          status: 'quarantined',
          reason: 'Runtime checks do not establish reusable quality.',
        },
        null,
        2,
      ),
    )
  const db = openCatalogDb(dbPath)
  try {
    db.exec('BEGIN IMMEDIATE')
    const now = new Date().toISOString()
    const provenance = JSON.stringify({
      kind: 'generated',
      model: input.model,
      effort: input.effort,
      transcript: input.transcript,
      parts: input.parts ?? [],
      sprites: input.sprites ?? [],
    })
    // Code is deduplicated, but each generation keeps its own immutable request,
    // model and context. Do not confuse "same bytes" with "same attempt".
    const metadata = JSON.stringify({
      ...input,
      code: undefined,
      validation: undefined,
      stage: input.stage ?? 'build',
      variant: input.variant ?? 0,
      id: attemptId,
      hash,
      status: 'quarantined',
    })
    const previous = db
      .prepare('SELECT metadata_json FROM candidate_attempts WHERE id=?')
      .get(attemptId)
    if (previous && previous.metadata_json !== metadata)
      throw new Error('An archived attempt cannot be reused with different code or provenance')
    db.prepare(`INSERT INTO generated_candidates
      (code_hash, first_run_id, latest_run_id, title, genre, players, source_path,
       spec_json, provenance_json, validation_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code_hash) DO NOTHING`).run(
      hash,
      input.runId,
      input.runId,
      input.spec.title,
      input.spec.genre,
      input.spec.players,
      relative(ROOT, dir),
      JSON.stringify(input.spec),
      provenance,
      JSON.stringify(input.validation),
      now,
      now,
    )
    const added = db
      .prepare('INSERT OR IGNORE INTO candidate_runs VALUES (?, ?, ?)')
      .run(input.runId, hash, now)
    if (Number(added.changes))
      db.prepare(`UPDATE generated_candidates SET latest_run_id=?,
      updated_at=?, occurrences=(SELECT COUNT(*) FROM candidate_runs WHERE code_hash=?)
      WHERE code_hash=?`).run(input.runId, now, hash, hash)
    db.prepare(`INSERT OR IGNORE INTO candidate_attempts
      (id,code_hash,run_id,stage,variant,metadata_json,validation_json,created_at,updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      attemptId,
      hash,
      input.runId,
      input.stage ?? 'build',
      input.variant ?? 0,
      metadata,
      JSON.stringify(input.validation),
      now,
      now,
    )
    db.exec('COMMIT')
    const folder = resolve(dir, 'attempts')
    mkdirSync(folder, { recursive: true })
    const path = resolve(folder, `${attemptId}.json`)
    if (!existsSync(path)) writeFileSync(path, `${metadata}\n`)
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  recordCandidateValidation(input.code, input.validation, dbPath, attemptId, storage)
  return hash
}
