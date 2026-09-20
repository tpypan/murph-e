import { createHash } from 'node:crypto'
import {
  existsSync,
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
import ts from 'typescript'

// Inventory is deliberately separate from admission into the tested runtime catalog.
const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const GLOBALS = new Set([
  'Math',
  'Number',
  'String',
  'Boolean',
  'Array',
  'Object',
  'JSON',
  'Map',
  'Set',
  'Infinity',
  'NaN',
  'undefined',
])
const VERSION = 2
export interface GameComponent {
  id: string
  name: string
  kind: 'function' | 'sprite-data' | 'data' | 'state'
  line: number
  offset: number
  endLine: number
  source: string
  dependencies: string[]
  blockers: string[]
  topLevel: boolean
}

function literal(node: ts.Node): boolean {
  if (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(
      node.kind,
    )
  )
    return true
  if (ts.isPrefixUnaryExpression(node))
    return (
      [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(node.operator) &&
      literal(node.operand)
    )
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(literal)
  if (ts.isObjectLiteralExpression(node))
    return node.properties.every(
      (p) =>
        ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && literal(p.initializer),
    )
  return false
}

/** Static parsing only: game code is never evaluated during collection. */
export function extractComponents(code: string): { components: GameComponent[]; errors: string[] } {
  const file = ts.createSourceFile('game.js', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
  const options = { allowJs: true, noLib: true, noResolve: true }
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === 'game.js' ? file : undefined),
    getDefaultLibFileName: () => '',
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: (name) => name === 'game.js',
    readFile: (name) => (name === 'game.js' ? code : undefined),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  }
  const program = ts.createProgram(['game.js'], options, host)
  const errors = program
    .getSyntacticDiagnostics(file)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  if (errors.length) return { components: [], errors }
  const checker = program.getTypeChecker()
  const sourceHash = hash(code)
  type Declaration = ts.FunctionDeclaration | ts.VariableDeclaration | ts.MethodDeclaration
  const declarations: Declaration[] = []
  const collect = (node: ts.Node) => {
    if (
      (ts.isFunctionDeclaration(node) && node.name) ||
      (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) ||
      ts.isMethodDeclaration(node)
    )
      declarations.push(node as Declaration)
    ts.forEachChild(node, collect)
  }
  collect(file)
  const ids = new Map<ts.Node, string>(
    declarations.map((d) => [d, hash(`${sourceHash}:${d.getStart(file)}:${d.kind}`)]),
  )
  const components = declarations.map((node): GameComponent => {
    const name = node.name!.getText(file)
    const variable = ts.isVariableDeclaration(node)
    const constant =
      variable &&
      ts.isVariableDeclarationList(node.parent) &&
      !!(node.parent.flags & ts.NodeFlags.Const)
    const initializer = variable ? node.initializer : undefined
    const fn =
      !variable ||
      (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)))
    const topLevel = variable
      ? ts.isVariableDeclarationList(node.parent) &&
        ts.isVariableStatement(node.parent.parent) &&
        ts.isSourceFile(node.parent.parent.parent)
      : ts.isFunctionDeclaration(node) && ts.isSourceFile(node.parent)
    const dependencies = new Set<string>(),
      blockers = new Set<string>()
    if (!topLevel) blockers.add('Nested declaration: adapt its enclosing scope before reuse')
    if (variable && !constant)
      blockers.add('Mutable shared state: needs an explicit instance/reset contract')
    if (initializer && !fn && !literal(initializer))
      blockers.add('Computed initialization: needs behavior review')
    const visit = (n: ts.Node) => {
      if (ts.isIdentifier(n)) {
        const parent = n.parent
        // Property names, labels and binding names do not reference external variables.
        const named = (parent as ts.NamedDeclaration).name === n
        if (
          (named && !ts.isShorthandPropertyAssignment(parent)) ||
          (ts.isPropertyAccessExpression(parent) && parent.name === n) ||
          ts.isLabeledStatement(parent) ||
          ts.isBreakStatement(parent) ||
          ts.isContinueStatement(parent)
        )
          return
        const symbol = ts.isShorthandPropertyAssignment(parent)
          ? checker.getShorthandAssignmentValueSymbol(parent)
          : checker.getSymbolAtLocation(n)
        const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0]
        if (decl && decl.pos >= node.pos && decl.end <= node.end) return
        if (decl && ids.has(decl)) dependencies.add(ids.get(decl)!)
        else if (decl) blockers.add(`Captured binding: ${n.text}`)
        else if (!GLOBALS.has(n.text)) blockers.add(`Unresolved/global binding: ${n.text}`)
      }
      if (n.kind === ts.SyntaxKind.ThisKeyword || n.kind === ts.SyntaxKind.SuperKeyword)
        blockers.add('Implicit receiver: needs an explicit instance contract')
      ts.forEachChild(n, visit)
    }
    visit(node)
    const source = variable
      ? `${constant ? 'const' : 'let'} ${node.getText(file)};`
      : node.getText(file)
    const sprite =
      initializer &&
      ts.isArrayLiteralExpression(initializer) &&
      initializer.elements.length >= 2 &&
      initializer.elements.every((e) => ts.isStringLiteral(e) && /^[.0-9a-f]+$/i.test(e.text))
    return {
      id: ids.get(node)!,
      name,
      kind: fn ? 'function' : !constant ? 'state' : sprite ? 'sprite-data' : 'data',
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      offset: node.getStart(file),
      endLine: file.getLineAndCharacterOfPosition(node.end).line + 1,
      source,
      dependencies: [...dependencies].sort(),
      blockers: [...blockers].sort(),
      topLevel,
    }
  })
  return { components, errors }
}

function open(path: string) {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path, { timeout: 3000 })
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS component_sources (
      code_hash TEXT PRIMARY KEY, version INTEGER NOT NULL, source_file TEXT NOT NULL,
      errors_json TEXT NOT NULL, indexed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS component_origins (
      source_path TEXT NOT NULL, code_hash TEXT NOT NULL, metadata_json TEXT NOT NULL,
      current INTEGER NOT NULL, PRIMARY KEY(source_path,code_hash));
    CREATE INDEX IF NOT EXISTS component_origin_hash ON component_origins(code_hash);
    CREATE TABLE IF NOT EXISTS component_blobs (code_hash TEXT PRIMARY KEY, source TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS game_components (
      id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      start_line INTEGER NOT NULL, end_line INTEGER NOT NULL, code_hash TEXT NOT NULL,
      dependencies_json TEXT NOT NULL, blockers_json TEXT NOT NULL, top_level INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status='needs-review'));
    CREATE INDEX IF NOT EXISTS component_names ON game_components(name,kind);
    CREATE INDEX IF NOT EXISTS component_source ON game_components(source_hash);`)
  if (
    !db
      .prepare('PRAGMA table_info(game_components)')
      .all()
      .some((c) => c.name === 'start_offset')
  )
    db.exec('ALTER TABLE game_components ADD COLUMN start_offset INTEGER NOT NULL DEFAULT 0')
  return db
}

export function indexGameComponents(
  input: { code: string; sourcePath: string; metadata?: unknown },
  dbPath: string,
  storage: string,
) {
  const codeHash = hash(input.code)
  const db = open(dbPath)
  try {
    const previous = db
      .prepare('SELECT version FROM component_sources WHERE code_hash=?')
      .get(codeHash)
    const parsed = previous?.version === VERSION ? null : extractComponents(input.code)
    const dir = resolve(storage, codeHash)
    mkdirSync(dir, { recursive: true })
    const sourceFile = resolve(dir, 'game.js')
    if (!existsSync(sourceFile)) writeFileSync(sourceFile, input.code)
    else if (hash(readFileSync(sourceFile, 'utf8')) !== codeHash)
      throw new Error('Component source archive hash mismatch')
    db.exec('BEGIN IMMEDIATE')
    db.prepare('UPDATE component_origins SET current=0 WHERE source_path=?').run(input.sourcePath)
    db.prepare(`INSERT INTO component_origins VALUES (?,?,?,1) ON CONFLICT(source_path,code_hash)
      DO UPDATE SET metadata_json=excluded.metadata_json,current=1`).run(
      input.sourcePath,
      codeHash,
      JSON.stringify(input.metadata ?? {}),
    )
    if (parsed) {
      db.prepare('DELETE FROM game_components WHERE source_hash=?').run(codeHash)
      db.prepare('INSERT OR REPLACE INTO component_sources VALUES (?,?,?,?,?)').run(
        codeHash,
        VERSION,
        sourceFile,
        JSON.stringify(parsed.errors),
        new Date().toISOString(),
      )
      const blob = db.prepare('INSERT OR IGNORE INTO component_blobs VALUES (?,?)')
      const insert = db.prepare(
        "INSERT INTO game_components (id,source_hash,name,kind,start_line,end_line,code_hash,dependencies_json,blockers_json,top_level,status,start_offset) VALUES (?,?,?,?,?,?,?,?,?,?,'needs-review',?)",
      )
      for (const c of parsed.components) {
        const sourceHash = hash(c.source)
        blob.run(sourceHash, c.source)
        insert.run(
          c.id,
          codeHash,
          c.name,
          c.kind,
          c.line,
          c.endLine,
          sourceHash,
          JSON.stringify(c.dependencies),
          JSON.stringify(c.blockers),
          Number(c.topLevel),
          c.offset,
        )
      }
    }
    db.exec('COMMIT')
    return {
      hash: codeHash,
      cached: !parsed,
      components: Number(
        db.prepare('SELECT count(*) AS n FROM game_components WHERE source_hash=?').get(codeHash)!
          .n,
      ),
      errors:
        parsed?.errors ??
        JSON.parse(
          String(
            db.prepare('SELECT errors_json FROM component_sources WHERE code_hash=?').get(codeHash)!
              .errors_json,
          ),
        ),
    }
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

/** Scan only game/code collections, never arbitrary repository files or credentials. */
export function harvestComponents(
  root: string,
  dbPath = resolve(root, 'data/catalog.sqlite'),
  storage = resolve(root, 'data/components'),
) {
  const collections = [
    ['library/games', 'game.js'],
    ['library/templates', null],
    ['library/catalog', 'module.js'],
    ['data/local-catalog', 'module.js'],
    ['data/catalog/candidates', 'game.js'],
    ['runs', 'game.js'],
  ] as const
  const results: { path: string; components?: number; cached?: boolean; errors: string[] }[] = []
  const boundary = realpathSync(root) + sep
  for (const [collection, filename] of collections) {
    const dir = resolve(root, collection)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.isSymbolicLink()) continue
      const path = filename ? resolve(dir, entry.name, filename) : resolve(dir, entry.name)
      if (filename ? !entry.isDirectory() : !entry.isFile() || !entry.name.endsWith('.js')) continue
      if (!existsSync(path)) continue
      try {
        if (!realpathSync(path).startsWith(boundary) || !statSync(path).isFile())
          throw new Error('Source escapes collection root')
        const metadata: Record<string, unknown> = { collection }
        for (const name of ['spec', 'manifest', 'source', 'candidate', 'catalog-context']) {
          const file = resolve(dirname(path), `${name}.json`)
          if (!existsSync(file)) continue
          if (!realpathSync(file).startsWith(boundary))
            throw new Error('Source metadata escapes collection root')
          metadata[name] = JSON.parse(readFileSync(file, 'utf8'))
        }
        const result = indexGameComponents(
          { code: readFileSync(path, 'utf8'), sourcePath: path, metadata },
          dbPath,
          storage,
        )
        results.push({
          path: relative(root, path),
          components: result.components,
          cached: result.cached,
          errors: result.errors,
        })
      } catch (error) {
        results.push({ path: relative(root, path), errors: [String(error)] })
      }
    }
  }
  return { sources: results.length, ...componentStats(dbPath), results }
}

export function componentStats(dbPath: string) {
  const db = open(dbPath)
  try {
    const count = (table: string) =>
      Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n)
    return {
      uniqueGames: count('component_sources'),
      components: count('game_components'),
      uniqueSnippets: count('component_blobs'),
      kinds: db.prepare('SELECT kind,count(*) AS count FROM game_components GROUP BY kind').all(),
      status: 'needs-review',
    }
  } finally {
    db.close()
  }
}

export function findComponents(dbPath: string, query: string, limit = 40) {
  const db = open(dbPath)
  try {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return db
      .prepare(`SELECT c.*, (SELECT json_group_array(source_path) FROM component_origins o WHERE o.code_hash=c.source_hash) AS origins_json
      FROM game_components c ORDER BY c.name,c.id`)
      .all()
      .filter((row) => {
        const haystack = `${row.name} ${row.kind} ${row.origins_json}`.toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
      .slice(0, Math.max(1, Math.min(200, limit)))
      .map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        line: row.start_line,
        status: row.status,
        dependencies: JSON.parse(String(row.dependencies_json)),
        blockers: JSON.parse(String(row.blockers_json)),
        origins: JSON.parse(String(row.origins_json)),
      }))
  } finally {
    db.close()
  }
}

/** Export a closed dependency graph for review; never silently capture another game's state. */
export function exportComponent(
  dbPath: string,
  id: string,
): {
  source: string
  name: string
  dependencies: number
  status: 'needs-review'
  provenance: unknown
} {
  const db = open(dbPath)
  try {
    const rows = db
      .prepare(`SELECT c.*, b.source FROM game_components c JOIN component_blobs b ON b.code_hash=c.code_hash
      WHERE c.source_hash=(SELECT source_hash FROM game_components WHERE id=?) ORDER BY c.start_offset,c.id`)
      .all(id)
    const byId = new Map(rows.map((row) => [String(row.id), row]))
    const selected = byId.get(id)
    if (!selected) throw new Error('Unknown component id')
    const archived = db
      .prepare('SELECT source_file FROM component_sources WHERE code_hash=?')
      .get(selected.source_hash!)
    if (
      !archived ||
      hash(readFileSync(String(archived.source_file), 'utf8')) !== selected.source_hash
    )
      throw new Error('Component source archive hash mismatch')
    const included = new Set<string>()
    const add = (key: string) => {
      if (included.has(key)) return
      const row = byId.get(key)
      if (!row) throw new Error('Missing component dependency')
      if (hash(String(row.source)) !== row.code_hash)
        throw new Error('Component snippet hash mismatch')
      const blockers: string[] = JSON.parse(String(row.blockers_json))
      if (!row.top_level || blockers.length)
        throw new Error(`${row.name} needs adaptation: ${blockers.join('; ')}`)
      included.add(key)
      for (const dep of JSON.parse(String(row.dependencies_json))) add(dep)
    }
    add(id)
    const source = `(() => {\n${rows
      .filter((row) => included.has(String(row.id)))
      .map((row) => row.source)
      .join('\n\n')}\nreturn ${selected.name};\n})()`
    new Script(source)
    return {
      source,
      name: String(selected.name),
      dependencies: included.size - 1,
      status: 'needs-review',
      provenance: {
        sourceHash: selected.source_hash,
        components: [...included],
        origins: db
          .prepare('SELECT source_path,metadata_json FROM component_origins WHERE code_hash=?')
          .all(selected.source_hash!)
          .map((row) => ({
            sourcePath: row.source_path,
            metadata: JSON.parse(String(row.metadata_json)),
          })),
      },
    }
  } finally {
    db.close()
  }
}
