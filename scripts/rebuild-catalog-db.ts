import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { indexCatalog, loadCatalog } from '../packages/harness/src/catalog.ts'
import { harvestComponents } from '../packages/harness/src/components.ts'
import { ROOT } from '../packages/harness/src/env.ts'
import { indexSprites, loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'

// Offline and repeatable: rebuild derived search indexes; preserve immutable
// component history. No provider client, generation route or API scope is used.
const issues: { id: string; message: string }[] = []
const parts = loadCatalog(undefined, issues)
const sprites = loadSpriteCatalog(parts, undefined, issues)
if (issues.length) throw new Error(JSON.stringify(issues))
const db = resolve(ROOT, 'data/catalog.sqlite')
const storage = resolve(ROOT, 'data/components')
mkdirSync(storage, { recursive: true })
indexCatalog(parts, db)
indexSprites(sprites, db)
const report = harvestComponents(ROOT, db, storage)
writeFileSync(resolve(storage, 'inventory.json'), JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    {
      foundations: parts.length,
      verified: parts.filter((p) => p.status === 'verified').length,
      sprites: sprites.length,
      sourceVersions: report.uniqueGames,
      declarations: report.components,
      uniqueSnippets: report.uniqueSnippets,
      errors: report.results.filter((r) => r.errors.length),
    },
    null,
    2,
  ),
)
if (report.results.some((r) => r.errors.length)) process.exitCode = 1
