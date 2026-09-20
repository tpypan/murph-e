/** Read-only inventory. No model calls, raw prompts, candidate code or pixel dumps. */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = resolve(root, 'data/catalog.sqlite')
const db = new DatabaseSync(path, { readOnly: true })
const quote = (name) => `"${name.replaceAll('"', '""')}"`
const group = (table, field) =>
  db
    .prepare(
      `SELECT ${quote(field)} AS value, count(*) AS count FROM ${quote(table)} GROUP BY ${quote(field)}`,
    )
    .all()
const tables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  .all()
  .map(({ name }) => ({
    name,
    rows: db.prepare(`SELECT count(*) AS n FROM ${quote(name)}`).get().n,
    columns: db
      .prepare(`PRAGMA table_info(${quote(name)})`)
      .all()
      .map(({ name, type, pk }) => ({ name, type, primaryKey: Boolean(pk) })),
  }))
const games = db
  .prepare(
    'SELECT id, version, content_hash, status, manifest_json, source_path FROM catalog_parts ORDER BY id',
  )
  .all()
  .map((row) => {
    const manifest = JSON.parse(row.manifest_json)
    return {
      id: row.id,
      title: manifest.title,
      family: manifest.entry,
      players: manifest.supportsPlayers,
      version: row.version,
      status: row.status,
      hash: row.content_hash,
      sourcePath: row.source_path,
      provenance: manifest.provenance.kind,
    }
  })
const sprites = db
  .prepare('SELECT id, pack_id, status, metadata_json FROM sprite_sets ORDER BY id')
  .all()
  .map((row) => {
    const metadata = JSON.parse(row.metadata_json)
    return {
      id: row.id,
      packId: row.pack_id,
      status: row.status,
      subject: metadata.subject,
      camera: metadata.camera,
      frames: Object.keys(metadata.frames ?? {}).length,
      animations: Object.keys(metadata.animations ?? {}).length,
      unsupportedStates: metadata.unsupportedStates ?? [],
    }
  })
const effects = db
  .prepare(
    'SELECT id, format, recipe_json, event_hint, content_hash, provenance FROM sound_effects ORDER BY id',
  )
  .all()
  .map(({ recipe_json, ...row }) => ({ ...row, recipe: JSON.parse(recipe_json) }))
const references = db
  .prepare('SELECT id, title, source_url FROM reference_games ORDER BY title')
  .all()
const auditPath = resolve(root, 'bench/audits/audio/gameplay-audit.json')
const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, 'utf8')) : null
const snapshot = {
  capturedAt: new Date().toISOString(),
  database: 'data/catalog.sqlite',
  bytes: statSync(path).size,
  integrity: db.prepare('PRAGMA quick_check').get().quick_check,
  tables,
  games,
  sprites,
  references,
  effects,
  counts: {
    gameStatus: group('catalog_parts', 'status'),
    spriteStatus: group('sprite_sets', 'status'),
    referenceStatus: group('reference_sheets', 'status'),
    candidateStatus: group('generated_candidates', 'status'),
    families: new Set(games.map((game) => game.family)).size,
  },
  audioAudit: audit && {
    file: 'bench/audits/audio/gameplay-audit.json',
    recordedAt: statSync(auditPath).mtime.toISOString(),
    summary: audit.summary,
    excludedCatalog: audit.excludedCatalog,
    runtimeHash: audit.runtimeHash,
    seeds: audit.seeds,
    framesPerSeed: audit.framesPerSeed,
    method: audit.method,
    games: audit.games.map(({ source, id, players, codeHash, cues, tones, passed }) => ({
      source,
      id,
      players,
      codeHash,
      cues,
      tones,
      passed,
    })),
  },
}
db.close()
const output = resolve(process.argv[2] ?? resolve(root, 'bench/audits/catalog-snapshot.json'))
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(
  JSON.stringify({
    output,
    integrity: snapshot.integrity,
    tables: tables.map(({ name, rows }) => ({ name, rows })),
    families: snapshot.counts.families,
  }),
)
