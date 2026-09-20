import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { BuildResult } from '../src/build.ts'
import type { PipelineOptions, PipelineResult } from '../src/pipeline.ts'

// Execute the real pipeline/history/storage modules. Only model producers, the
// browser probe and unrelated shell/file helpers are replaced at bundle time.
// No environment credentials, provider transport or model request is imported.
const require = createRequire(resolve(import.meta.dirname, '../../runtime/package.json'))
const stubs: Record<string, string> = {
  '@htn/probe':
    'export const controlsFromSpec=()=>[];export const probe=(...args)=>fixture.probe(...args);',
  './env.ts': `export const ROOT=fixture.root;export const MODELS={build:'fixture-build',buildEffort:'medium',repair:'fixture-repair',repairEffort:'medium',remix:'fixture-remix',remixEffort:'low'};`,
  './build.ts':
    'export const BUILD_MAX_OUTPUT_TOKENS=20000;export const build=(...args)=>fixture.build(...args);',
  './repair.ts': 'export const repair=(...args)=>fixture.repair(...args);',
  './spec.ts':
    'export const specify=async()=>({spec:fixture.spec,context:{},prompt:{system:"",user:""},ms:0,usage:{}});',
  './prompt.ts':
    'export const loadTemplates=()=>[];export const buildPrompt=()=>({system:"",user:"",designContext:{},referenceContext:{}});',
  './remix.ts':
    'export const remix=(...args)=>fixture.remix(...args);export const remixSystemPrompt=()=>"";export const remixUserTurn=()=>"";',
  './library.ts':
    'export const pickFallback=()=>({code:"fallback",title:"FALLBACK",slug:"fallback",source:"library"});export const keepInLibrary=()=>{throw Error("unexpected publish")};',
  './design-context.ts': 'export const recordDesignContext=()=>{};',
  './run-store.ts': 'export const createRun=()=>{throw Error("test must supply an isolated run")};',
}
let bundled: string | undefined
async function pipelineFor(fixture: Record<string, unknown>) {
  if (!bundled) {
    const built = await require('esbuild').build({
      entryPoints: [resolve(import.meta.dirname, '../src/pipeline.ts')],
      bundle: true,
      write: false,
      platform: 'node',
      format: 'cjs',
      plugins: [
        {
          name: 'offline-producers',
          setup(builder: {
            onResolve: (
              options: { filter: RegExp },
              fn: (args: { path: string }) => unknown,
            ) => void
            onLoad: (
              options: { filter: RegExp; namespace: string },
              fn: (args: { path: string }) => unknown,
            ) => void
          }) {
            builder.onResolve({ filter: /.*/ }, (args) =>
              stubs[args.path] ? { path: args.path, namespace: 'fixture' } : undefined,
            )
            builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
              contents: stubs[args.path],
              loader: 'js',
            }))
          },
        },
      ],
    })
    bundled = built.outputFiles[0].text
  }
  const module = {
    exports: {} as { pipeline: (words: string, opts: PipelineOptions) => Promise<PipelineResult> },
  }
  Function(
    'module',
    'exports',
    'require',
    'fixture',
    bundled!,
  )(module, module.exports, require, fixture)
  return module.exports.pipeline
}

function output(code = 'function init() {}', syntaxError: string | null = null): BuildResult {
  return {
    code,
    sourceCode: code,
    raw: `raw:${code}`,
    syntaxError,
    incompleteReason: null,
    ms: 0,
    ttftMs: 0,
    usage: { input: 0, cached: 0, output: 0, reasoning: 0 },
  }
}
function probeResult(ok: boolean) {
  return { ok, observations: ok ? [] : ['bad controls'], checks: {}, ms: 0, thumb: null }
}

test('actual pipeline archives build, repair, remix and remix-repair before probes, including raced identical code', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN IN OFFLINE TEST')
  })
  for (const scenario of ['probe-error', 'repair', 'remix', 'remix-repair', 'race'] as const) {
    const root = mkdtempSync(resolve(tmpdir(), 'pipeline-history-'))
    const database = resolve(root, 'data/catalog.sqlite')
    const rows = () => {
      const db = new DatabaseSync(database)
      try {
        return db.prepare('SELECT * FROM candidate_attempts ORDER BY rowid').all()
      } finally {
        db.close()
      }
    }
    const events: Array<{ type: string; data?: Record<string, unknown> }> = []
    const spec = {
      title: 'FIXTURE',
      genre: 'paddle',
      players: 1,
      note: '',
      controls: [],
      remix: scenario.startsWith('remix'),
      changes: ['requested edit'],
    }
    let probes = 0
    const fixture = {
      root,
      spec,
      build: async () =>
        output('function init() {}', scenario === 'repair' ? 'fixture syntax issue' : null),
      repair: async () => output('function init() {return 1}'),
      remix: async () => ({
        ...output('function init() {return 2}'),
        blocks: 1,
        applyError: scenario === 'remix-repair' ? 'fixture ambiguous match' : null,
      }),
      probe: async () => {
        probes++
        assert(
          rows().some((r) => JSON.parse(String(r.validation_json)).outcome === 'pending'),
          `${scenario} reaches probe only after durable pending archival`,
        )
        if (scenario === 'probe-error' || (scenario === 'race' && probes === 1))
          throw Error('browser fixture failed')
        return probeResult(true)
      },
    }
    try {
      const pipeline = await pipelineFor(fixture)
      const result = await pipeline('offline fixture request', {
        race: scenario === 'race' ? 2 : 1,
        keep: false,
        current: spec.remix
          ? { code: 'original', title: 'OLD', slug: 'old', spec: spec as never }
          : null,
        run: {
          id: scenario,
          dir: root,
          write: (name) => resolve(root, name),
          event: (type, data) => events.push({ type, data }),
        },
      })
      const attempts = rows()
      const stages = attempts.map((r) => r.stage)
      assert.deepEqual(
        stages,
        {
          'probe-error': ['build'],
          repair: ['build', 'repair'],
          remix: ['remix'],
          'remix-repair': ['remix', 'remix-repair'],
          race: ['build', 'build'],
        }[scenario],
      )
      assert.deepEqual(
        attempts.map((r) => JSON.parse(String(r.validation_json)).outcome),
        {
          'probe-error': ['error'],
          repair: ['failed', 'passed'],
          remix: ['passed'],
          'remix-repair': ['failed', 'passed'],
          race: ['error', 'passed'],
        }[scenario],
      )
      assert.equal(
        result.source,
        {
          'probe-error': 'library',
          repair: 'repair',
          remix: 'remix',
          'remix-repair': 'remix',
          race: 'build',
        }[scenario],
      )
      assert(!events.some((e) => e.type === 'catalog-error'), JSON.stringify(events))
      for (const attempt of attempts) {
        const metadata = JSON.parse(String(attempt.metadata_json))
        assert.equal(metadata.transcript, 'offline fixture request')
        assert.match(metadata.rawOutput, /^raw:/)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('completed cancelled outputs are durable without probing, repair or Ready', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  for (const stage of ['build', 'repair', 'remix', 'remix-repair'] as const) {
    const root = mkdtempSync(resolve(tmpdir(), 'cancelled-history-'))
    const controller = new AbortController()
    const events: string[] = []
    let probes = 0
    let repairs = 0
    const spec = {
      title: 'CANCEL',
      genre: 'paddle',
      players: 1,
      note: '',
      controls: [],
      remix: stage.startsWith('remix'),
      changes: ['edit'],
    }
    const complete = () => {
      controller.abort('user stopped')
      return output('function init() {return 42}')
    }
    const fixture = {
      root,
      spec,
      build: async () => (stage === 'build' ? complete() : output('function init() {}', 'invalid')),
      remix: async () => ({
        ...(stage === 'remix' ? complete() : output()),
        blocks: 1,
        applyError: stage === 'remix-repair' ? 'invalid edit' : null,
      }),
      repair: async () => {
        repairs++
        return complete()
      },
      probe: async () => {
        probes++
        return probeResult(true)
      },
    }
    try {
      const pipeline = await pipelineFor(fixture)
      await assert.rejects(
        pipeline('cancel fixture', {
          race: 1,
          keep: false,
          signal: controller.signal,
          current: spec.remix
            ? { code: 'original', title: 'OLD', slug: 'old', spec: spec as never }
            : null,
          onEvent: (e) => events.push(e.type),
          run: { id: stage, dir: root, write: (name) => resolve(root, name), event: () => {} },
        }),
        { name: 'AbortError' },
      )
      assert.equal(probes, 0)
      assert.equal(repairs, stage.endsWith('repair') ? 1 : 0)
      assert(!events.includes('ready'))
      assert(!events.includes('fallback'))
      const db = new DatabaseSync(resolve(root, 'data/catalog.sqlite'))
      try {
        const attempts = db.prepare('SELECT * FROM candidate_attempts ORDER BY rowid').all()
        const last = attempts.at(-1)!
        assert.equal(last.stage, stage)
        assert.equal(JSON.parse(String(last.validation_json)).outcome, 'cancelled')
        const metadata = JSON.parse(String(last.metadata_json))
        assert.equal(metadata.transcript, 'cancel fixture')
        assert.equal(metadata.rawOutput, 'raw:function init() {return 42}')
        assert.equal(
          metadata.model,
          stage.endsWith('repair') ? 'fixture-repair' : `fixture-${stage}`,
        )
      } finally {
        db.close()
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('race keeps winner and archives a completed loser returned after cancellation', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'race-cancel-history-'))
  let loserFinished!: () => void
  const loserDone = new Promise<void>((resolve) => {
    loserFinished = resolve
  })
  let probes = 0
  const spec = {
    title: 'RACE',
    genre: 'paddle',
    players: 1,
    note: '',
    controls: [],
    remix: false,
    changes: [],
  }
  const fixture = {
    root,
    spec,
    build: async (_prompt: unknown, opts: { variant: number; signal: AbortSignal }) => {
      if (opts.variant === 1)
        await new Promise<void>((resolve) =>
          opts.signal.addEventListener('abort', () => resolve(), { once: true }),
        )
      return output(`function init() {return ${opts.variant}}`)
    },
    repair: () => {
      throw Error('unexpected repair')
    },
    probe: async () => {
      probes++
      return probeResult(true)
    },
  }
  try {
    const pipeline = await pipelineFor(fixture)
    const result = await pipeline('raced request', {
      race: 2,
      keep: false,
      run: {
        id: 'race',
        dir: root,
        write: (name) => resolve(root, name),
        event: (type, data) => {
          if (type === 'catalog-candidate' && data?.variant === 1 && data?.outcome === 'cancelled')
            loserFinished()
        },
      },
    })
    await loserDone
    assert.equal(result.source, 'build')
    assert.match(result.code, /return 0/)
    assert.equal(probes, 1)
    const db = new DatabaseSync(resolve(root, 'data/catalog.sqlite'))
    try {
      const rows = db
        .prepare('SELECT variant,validation_json FROM candidate_attempts ORDER BY variant')
        .all()
      assert.deepEqual(
        rows.map((r) => JSON.parse(String(r.validation_json)).outcome),
        ['passed', 'cancelled'],
      )
    } finally {
      db.close()
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
