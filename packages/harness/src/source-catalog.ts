import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { z } from 'zod'
import { CATALOG_DB, openCatalogDb } from './catalog.ts'
import { ROOT } from './env.ts'

const sourceUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value)
    return (
      url.origin === 'https://www.spriters-resource.com' &&
      /^\/(?:arcade|sega_genesis)\//.test(url.pathname)
    )
  }, 'Expected an Arcade or Sega Genesis source page')
const SheetSchema = z.object({
  assetId: z.string().regex(/^\d+$/),
  title: z.string().min(1),
  kind: z.enum([
    'character',
    'enemy',
    'assist',
    'stage',
    'tiles',
    'effect',
    'hud',
    'portrait',
    'item',
    'map',
    'vehicle',
    'mixed',
  ]),
  url: sourceUrl,
  inspection: z.enum(['listed-on-game-page', 'sheet-inspected']),
  // External discovery never confers admission into the runtime sprite catalog.
  runtimeReady: z.literal(false),
  cache: z
    .object({
      path: z.string(),
      metadataPath: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      dimensions: z.tuple([z.number().int().positive(), z.number().int().positive()]),
      sourceImage: z.string().url(),
      uploader: z.string(),
    })
    .optional(),
})
const SourceSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.string(),
  sectionUrl: sourceUrl,
  verifiedAt: z.string(),
  verification: z.string(),
  rights: z.object({ classification: z.string(), termsUrl: z.string().url(), notes: z.string() }),
  games: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9]+$/),
      title: z.string(),
      url: sourceUrl,
      families: z.array(z.string()).min(1),
      camera: z.string(),
      purpose: z.string(),
      limitations: z.array(z.string()),
      sheets: z.array(SheetSchema).min(1),
    }),
  ),
  gaps: z.array(z.object({ family: z.string(), note: z.string() })),
})
export type SourceManifest = z.infer<typeof SourceSchema>
export type SourceSheet = z.infer<typeof SheetSchema> & {
  gameId: string
  game: string
  families: string[]
  camera: string
  status: 'discovered' | 'downloaded'
  cacheIssue?: string
}
export const SOURCE_FILE = resolve(ROOT, 'library/sources/spriters-resource-arcade.json')

function cacheFile(root: string, path: string): string {
  const file = resolve(root, path)
  const base = resolve(root, 'data/reference-cache')
  if (!file.startsWith(`${base}${sep}`)) throw new Error('Source path escapes reference cache')
  if (existsSync(file)) {
    if (!realpathSync(file).startsWith(`${realpathSync(base)}${sep}`))
      throw new Error('Source symlink escapes reference cache')
    if (!statSync(file).isFile()) throw new Error('Source cache entry is not a regular file')
  }
  return file
}

function checkCache(sheet: z.infer<typeof SheetSchema>, root: string): string | undefined {
  const cache = sheet.cache!
  const file = cacheFile(root, cache.path)
  const metadata = cacheFile(root, cache.metadataPath)
  if (!existsSync(file)) return 'Cache file not present on this machine'
  const bytes = readFileSync(file)
  if (createHash('sha256').update(bytes).digest('hex') !== cache.sha256)
    return 'Cache content hash mismatch; re-import before use'
  if (
    bytes.length < 24 ||
    bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    bytes.toString('ascii', 12, 16) !== 'IHDR'
  )
    return 'Cache is not a PNG with an IHDR header'
  if (
    bytes.readUInt32BE(16) !== cache.dimensions[0] ||
    bytes.readUInt32BE(20) !== cache.dimensions[1]
  )
    return 'PNG dimensions differ from the recorded source'
  if (!existsSync(metadata)) return 'Source metadata missing'
  try {
    const provenance = JSON.parse(readFileSync(metadata, 'utf8'))
    if (
      provenance.sha256 !== cache.sha256 ||
      provenance.sourcePage !== sheet.url ||
      provenance.assetId !== sheet.assetId ||
      provenance.sourceImage !== cache.sourceImage
    )
      return 'Cached provenance differs from the source registry'
  } catch {
    return 'Cached provenance is not valid JSON'
  }
  return undefined
}

export function loadSourceManifest(path?: string): SourceManifest {
  const files = path
    ? [path]
    : [
        SOURCE_FILE,
        resolve(ROOT, 'library/sources/spriters-resource-dc-arcade.json'),
        resolve(ROOT, 'library/sources/spriters-resource-sonic.json'),
      ]
  const manifests = files.map((file) => SourceSchema.parse(JSON.parse(readFileSync(file, 'utf8'))))
  const manifest = {
    ...manifests[0]!,
    games: manifests.flatMap((m) => m.games),
    gaps: manifests.flatMap((m) => m.gaps),
  }
  const games = new Set<string>(),
    sheets = new Set<string>()
  for (const game of manifest.games) {
    if (games.has(game.id)) throw new Error(`Duplicate source game: ${game.id}`)
    games.add(game.id)
    for (const sheet of game.sheets) {
      if (sheets.has(sheet.assetId)) throw new Error(`Duplicate source sheet: ${sheet.assetId}`)
      if (sheet.url !== `${game.url}asset/${sheet.assetId}/`)
        throw new Error(`Sheet does not belong to source game: ${sheet.assetId}`)
      sheets.add(sheet.assetId)
    }
  }
  return manifest
}

/** Only a matching local PNG hash earns downloaded status; URLs remain references. */
export function sourceSheets(manifest = loadSourceManifest(), root = ROOT): SourceSheet[] {
  return manifest.games.flatMap((game) =>
    game.sheets.map((sheet) => {
      let status: SourceSheet['status'] = 'discovered'
      let cacheIssue: string | undefined
      if (sheet.cache) {
        cacheIssue = checkCache(sheet, root)
        if (!cacheIssue) status = 'downloaded'
      }
      return {
        ...sheet,
        gameId: game.id,
        game: game.title,
        families: game.families,
        camera: game.camera,
        status,
        ...(cacheIssue ? { cacheIssue } : {}),
      }
    }),
  )
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Preparation-time lookup. Not injected into the fast builder as imaginary assets. */
export function findSourceReferences(query: string, sheets = sourceSheets()): SourceSheet[] {
  const terms = normalize(query).split(' ').filter(Boolean)
  return sheets.filter((sheet) => {
    const haystack = normalize(
      [sheet.title, sheet.game, sheet.gameId, sheet.kind, sheet.camera, ...sheet.families].join(
        ' ',
      ),
    )
    return terms.every((term) => haystack.includes(term))
  })
}

export function indexSources(manifest = loadSourceManifest(), dbPath = CATALOG_DB, root = ROOT) {
  const sheets = sourceSheets(manifest, root)
  const db = openCatalogDb(dbPath)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS reference_games (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, source_url TEXT NOT NULL,
      families_json TEXT NOT NULL, metadata_json TEXT NOT NULL, verified_at TEXT NOT NULL
    ); CREATE TABLE IF NOT EXISTS reference_sheets (
      asset_id TEXT PRIMARY KEY, game_id TEXT NOT NULL, title TEXT NOT NULL,
      kind TEXT NOT NULL, source_url TEXT NOT NULL, status TEXT NOT NULL,
      runtime_ready INTEGER NOT NULL CHECK(runtime_ready=0), metadata_json TEXT NOT NULL,
      FOREIGN KEY(game_id) REFERENCES reference_games(id)
    ); CREATE INDEX IF NOT EXISTS reference_kind ON reference_sheets(kind, status);`)
    db.exec('BEGIN IMMEDIATE; DELETE FROM reference_sheets; DELETE FROM reference_games;')
    const addGame = db.prepare('INSERT INTO reference_games VALUES (?, ?, ?, ?, ?, ?)')
    const addSheet = db.prepare('INSERT INTO reference_sheets VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
    for (const game of manifest.games)
      addGame.run(
        game.id,
        game.title,
        game.url,
        JSON.stringify(game.families),
        JSON.stringify({
          ...game,
          sheets: undefined,
          rights: manifest.rights,
          verification: manifest.verification,
        }),
        manifest.verifiedAt,
      )
    for (const sheet of sheets)
      addSheet.run(
        sheet.assetId,
        sheet.gameId,
        sheet.title,
        sheet.kind,
        sheet.url,
        sheet.status,
        JSON.stringify(sheet),
      )
    db.exec('COMMIT')
    return {
      games: manifest.games.length,
      sheets: sheets.length,
      downloaded: sheets.filter((s) => s.status === 'downloaded').length,
      runtimeReady: 0,
      gaps: manifest.gaps,
    }
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}
