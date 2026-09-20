import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { BuildResult } from '../src/build.ts'
import type {
  PipelineBothOptions,
  PipelineBothResult,
  PipelineEvent,
  PipelineOptions,
  PipelineResult,
} from '../src/pipeline.ts'

// Execute the real pipeline/history/storage modules. Only model producers, the
// browser probe and unrelated shell/file helpers are replaced at bundle time.
// No environment credentials, provider transport or model request is imported.
const require = createRequire(resolve(import.meta.dirname, '../../runtime/package.json'))
const stubs: Record<string, string> = {
  './jev.ts':
    'export const jevEnabled=()=>Boolean(fixture.hybrid);export const assertJevConfigured=()=>{};export const selectWithJev=(...args)=>fixture.selectWithJev(...args);',
  '@htn/probe':
    'export const controlsFromSpec=()=>[];export const probe=(...args)=>fixture.probe(...args);',
  './env.ts': `export const ROOT=fixture.root;export const MODELS={build:'fixture-build',buildEffort:'medium',repair:'fixture-repair',repairEffort:'medium',remix:'fixture-remix',remixEffort:'low'};`,
  './build.ts':
    'export const BUILD_MAX_OUTPUT_TOKENS=20000;export const build=(...args)=>fixture.build(...args);',
  './repair.ts': 'export const repair=(...args)=>fixture.repair(...args);',
  './spec.ts':
    'export const specify=async(t,o)=>(fixture.specifyCalls=(fixture.specifyCalls??0)+1,{spec:{...fixture.spec,players:o?.players??1},context:{},prompt:{system:"",user:""},ms:0,usage:{}});',
  './prompt.ts':
    'export const loadTemplates=()=>[];export const buildPrompt=(...args)=>{fixture.capturePrompt?.(...args);return {system:"",user:"",designContext:{},referenceContext:{}}};',
  './remix.ts':
    'export const remix=(...args)=>fixture.remix(...args);export const remixSystemPrompt=()=>"";export const remixUserTurn=()=>"";',
  './library.ts':
    'export const pickFallback=()=>({code:"fallback",title:"FALLBACK",slug:"fallback",source:"library"});export const keepInLibrary=()=>{throw Error("unexpected publish")};',
  './design-context.ts': 'export const recordDesignContext=()=>{};',
  './run-store.ts': 'export const createRun=()=>{throw Error("test must supply an isolated run")};',
}
let bundled: string | undefined
interface PipelineModule {
  pipeline: (words: string, opts: PipelineOptions) => Promise<PipelineResult>
  pipelineBoth: (words: string, opts: PipelineBothOptions) => Promise<PipelineBothResult>
}
async function pipelineFor(fixture: Record<string, unknown>) {
  return (await moduleFor(fixture)).pipeline
}
async function moduleFor(fixture: Record<string, unknown>): Promise<PipelineModule> {
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
  const module = { exports: {} as PipelineModule }
  Function(
    'module',
    'exports',
    'require',
    'fixture',
    bundled!,
  )(module, module.exports, require, fixture)
  return module.exports
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

test('both modes share one default build/run and both must pass before ready', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  for (const rejectTwoPlayers of [false, true]) {
    const root = mkdtempSync(resolve(tmpdir(), 'shared-game-'))
    const events: PipelineEvent[] = []
    const checked: Array<{ code: string; players: number }> = []
    let builds = 0,
      repairs = 0
    const fixture = {
      root,
      specifyCalls: 0,
      spec: {
        title: 'SHARED',
        genre: 'paddle',
        players: 1,
        note: '',
        controls: [],
        remix: false,
        multiplayer: {
          mode: 'versus',
          solo: 'CPU rival',
          playerOne: 'P1',
          playerTwo: 'P2',
          camera: 'shared',
          scoring: 'Separate',
          endConditions: 'First to five',
        },
      },
      build: async () => {
        builds++
        return output('function init() {}')
      },
      repair: async () => {
        repairs++
        return output('function init() {return 1}')
      },
      probe: async (code: string, opts: { players: number }) => {
        checked.push({ code, players: opts.players })
        return probeResult(!rejectTwoPlayers || opts.players === 1)
      },
    }
    try {
      const { pipelineBoth } = await moduleFor(fixture)
      const result = await pipelineBoth('one game in either mode', {
        keep: false,
        run: { id: 'shared-run', dir: root, write: (name) => resolve(root, name), event: () => {} },
        onEvent: (e) => events.push(e),
      })
      assert.equal(fixture.specifyCalls, 1, 'one spec for the shared game')
      assert.equal(builds, 1, 'default must not race or split by player count')
      assert.equal(repairs, rejectTwoPlayers ? 1 : 0)
      assert.deepEqual(checked.slice(0, 2), [
        { code: 'function init() {}', players: 1 },
        { code: 'function init() {}', players: 2 },
      ])
      const ready = events.filter((e) => e.type === 'ready')
      assert.equal(ready.length, 1, 'one ready event and saved output')
      if (rejectTwoPlayers) {
        assert.ok(result.results[2] instanceof Error)
        assert.equal(ready[0]!.source, 'library')
        assert.deepEqual(
          ready[0]!.supportedPlayers,
          [1],
          'never advertise an unverified fallback as dual-mode',
        )
        assert.deepEqual(
          checked.slice(2).map((p) => p.players),
          [1, 2],
          'repair also passes through both probes',
        )
      } else {
        const one = result.results[1],
          two = result.results[2]
        assert.ok(!(one instanceof Error) && !(two instanceof Error))
        assert.equal(one.code, two.code)
        assert.equal(one.run, two.run)
        assert.equal(one.slug, two.slug)
        assert.deepEqual(ready[0]!.supportedPlayers, [1, 2])
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('hybrid pipeline selects once before both Astra builds, archives advice, and stops on router failure', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  for (const fails of [false, true]) {
    const root = mkdtempSync(resolve(tmpdir(), 'jev-pipeline-'))
    const order: string[] = []
    const saved: Record<string, string | Buffer> = {}
    const hybrid = {
      catalog: { parts: [], text: '', hash: '' },
      guidance: 'Jev advice',
      audit: { model: 'fixture-jev', selectedId: null },
    }
    const fixture = {
      root,
      hybrid: true,
      spec: { title: 'HYBRID', genre: 'novel', players: 1, note: '', controls: [], remix: false },
      selectWithJev: async () => {
        order.push('jev')
        if (fails) throw Error('Jev fixture failure')
        return hybrid
      },
      capturePrompt: (
        _spec: unknown,
        _transcript: string,
        _templates: unknown,
        actual: unknown,
      ) => {
        assert.equal(actual, hybrid)
        order.push('prompt')
      },
      build: async () => {
        order.push('astra')
        return output()
      },
      probe: async () => probeResult(true),
    }
    try {
      const pipeline = await pipelineFor(fixture)
      const pending = pipeline('hybrid fixture', {
        race: 2,
        keep: false,
        run: {
          id: 'hybrid',
          dir: root,
          event: () => {},
          write: (name, content) => {
            saved[name] = content
            return resolve(root, name)
          },
        },
      })
      if (fails) {
        await assert.rejects(pending, /Jev fixture failure/)
        assert.deepEqual(order, ['jev'])
      } else {
        assert.equal((await pending).source, 'build')
        assert.deepEqual(order, ['jev', 'prompt', 'astra', 'astra'])
        assert.deepEqual(JSON.parse(String(saved['jev-routing.json'])), hybrid.audit)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('new-game pipeline checks both modes and repairs a broken multiplayer mode even in a solo session', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  for (const repairedP2Works of [false, true]) {
    const root = mkdtempSync(resolve(tmpdir(), 'dual-mode-history-'))
    const calls: Array<{ code: string; players: number }> = []
    const capturedChecks: Record<string, unknown>[] = []
    let repairs = 0
    const fixture = {
      root,
      spec: {
        title: 'DUAL',
        genre: 'paddle',
        players: 1,
        note: '',
        controls: [],
        remix: false,
        multiplayer: {
          mode: 'versus',
          solo: 'CPU opponent',
          playerOne: 'Paddle one',
          playerTwo: 'Paddle two',
          camera: 'shared',
          scoring: 'Separate scores',
          endConditions: 'First to five',
        },
      },
      build: async () => output('first'),
      repair: async (_prompt: unknown, _spec: unknown, _code: string, observations: string[]) => {
        repairs++
        assert.ok(observations.some((o) => o.startsWith('2P mode:')))
        return output('repaired')
      },
      probe: async (
        code: string,
        options: { players: number; thumb: boolean; requireIndependentPlayers: boolean },
      ) => {
        calls.push({ code, players: options.players })
        assert.equal(options.thumb, options.players === 1)
        assert.equal(options.requireIndependentPlayers, options.players === 2)
        return probeResult(options.players === 1 || (code === 'repaired' && repairedP2Works))
      },
    }
    try {
      const pipeline = await pipelineFor(fixture)
      const result = await pipeline('dual-mode fixture', {
        race: 1,
        keep: false,
        players: 1,
        run: {
          id: 'dual',
          dir: root,
          event: () => {},
          write: (name, content) => {
            if (name === 'probe.json') capturedChecks.push(JSON.parse(String(content)))
            return resolve(root, name)
          },
        },
      })
      assert.equal(repairs, 1)
      assert.deepEqual(calls, [
        { code: 'first', players: 1 },
        { code: 'first', players: 2 },
        { code: 'repaired', players: 1 },
        { code: 'repaired', players: 2 },
      ])
      assert.equal(result.source, repairedP2Works ? 'repair' : 'library')
      assert.equal(capturedChecks.length, repairedP2Works ? 1 : 0)
      if (repairedP2Works) {
        assert.equal((capturedChecks[0]!.checks as Record<string, boolean>)['1p:passed'], true)
        assert.equal((capturedChecks[0]!.checks as Record<string, boolean>)['2p:passed'], true)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('cancellation between player-mode checks archives cancellation and never repairs or publishes', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'cancel-dual-mode-'))
  const controller = new AbortController()
  let probes = 0
  let repairs = 0
  const fixture = {
    root,
    spec: {
      title: 'CANCEL DUAL',
      genre: 'paddle',
      players: 1,
      note: '',
      controls: [],
      remix: false,
      multiplayer: {
        mode: 'versus',
        solo: 'CPU',
        playerOne: 'P1',
        playerTwo: 'P2',
        camera: 'shared',
        scoring: 'Separate',
        endConditions: 'First to five',
      },
    },
    build: async () => output(),
    repair: async () => {
      repairs++
      return output()
    },
    probe: async () => {
      probes++
      controller.abort('user stopped')
      return probeResult(true)
    },
  }
  try {
    const pipeline = await pipelineFor(fixture)
    await assert.rejects(
      pipeline('cancel between modes', {
        race: 1,
        signal: controller.signal,
        keep: false,
        run: {
          id: 'cancel-dual',
          dir: root,
          write: (name) => resolve(root, name),
          event: () => {},
        },
      }),
      { name: 'AbortError' },
    )
    assert.equal(probes, 1)
    assert.equal(repairs, 0)
    const db = new DatabaseSync(resolve(root, 'data/catalog.sqlite'))
    try {
      const row = db.prepare('SELECT validation_json FROM candidate_attempts').get()!
      assert.equal(JSON.parse(String(row.validation_json)).outcome, 'cancelled')
    } finally {
      db.close()
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('shared hybrid game selects Jev and builds once, then validates the same code in both modes', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  const root = mkdtempSync(resolve(tmpdir(), 'hybrid-both-'))
  let builds = 0
  const selected: number[] = [],
    checked: number[] = [],
    events: PipelineEvent[] = []
  const fixture = {
    root,
    hybrid: true,
    spec: {
      title: 'HYBRID BOTH',
      genre: 'novel',
      players: 1,
      note: '',
      controls: [],
      remix: false,
      multiplayer: {
        mode: 'coop',
        solo: 'One human',
        playerOne: 'Independent P1',
        playerTwo: 'Independent P2',
        camera: 'shared',
        scoring: 'Separate',
        endConditions: 'Clear the stage',
      },
    },
    selectWithJev: async (_words: string, spec: { players: number }) => {
      selected.push(spec.players)
      return {
        catalog: { parts: [], text: '', hash: '' },
        guidance: '',
        audit: { selectedId: null },
      }
    },
    build: async () => {
      builds++
      return output()
    },
    probe: async (_code: string, opts: { players: number }) => {
      checked.push(opts.players)
      return probeResult(true)
    },
  }
  try {
    const { pipelineBoth } = await moduleFor(fixture)
    const result = await pipelineBoth('hybrid both', {
      keep: false,
      onEvent: (e) => events.push(e),
      run: {
        id: 'hybrid-shared',
        dir: root,
        event: () => {},
        write: (name) => resolve(root, name),
      },
    })
    assert.deepEqual(selected, [1])
    assert.equal(builds, 1)
    assert.deepEqual(checked, [1, 2])
    assert.deepEqual(
      events.filter((e) => e.type === 'ready').map((e) => e.supportedPlayers),
      [[1, 2]],
    )
    for (const n of [1, 2] as const) {
      const r = result.results[n]
      assert.ok(!(r instanceof Error))
      assert.equal(r.source, 'build')
      assert.equal(r.players, n)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('publication queues the delivered game and creator after both mode checks and before ready', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  for (const repair of [false, true]) {
    const root = mkdtempSync(resolve(tmpdir(), 'arcade-publish-'))
    const folder = resolve(root, 'data/arcade/outbox')
    const pending = () =>
      existsSync(folder)
        ? readdirSync(folder).map((name) => JSON.parse(readFileSync(resolve(folder, name), 'utf8')))
        : []
    const checked: number[] = []
    let ready = false
    const thumbnail = Buffer.from('offline-thumbnail')
    const fixture = {
      root,
      spec: {
        title: 'PUBLICATION FIXTURE',
        multiplayer: {
          mode: 'versus',
          solo: 'CPU opponent',
          playerOne: 'Paddle one',
          playerTwo: 'Paddle two',
          camera: 'shared',
          scoring: 'Separate',
          endConditions: 'First to five',
        },
        oneLiner: 'One shared game',
        genre: 'paddle',
        players: 1,
        note: '',
        controls: [],
      },
      build: async () => output('function init() {}', repair ? 'syntax fixture' : null),
      repair: async () => output('function init() { return 1 }'),
      probe: async (_code: string, options: { players: number }) => {
        assert.equal(pending().length, 0, 'unverified games must not be published')
        checked.push(options.players)
        return { ...probeResult(true), thumb: thumbnail }
      },
    }
    try {
      const pipeline = await pipelineFor(fixture)
      const result = await pipeline('offline game idea', {
        publish: true,
        keep: false,
        creator: { badgeId: 'offline-badge', name: 'Fixture Creator' },
        run: {
          id: 'publication-run',
          dir: root,
          write: (name) => resolve(root, name),
          event: () => {},
        },
        onEvent: (event) => {
          if (event.type === 'ready') {
            assert.equal(pending().length, 1, 'ready requires a durable delivery record')
            ready = true
          }
        },
      })
      assert.equal(ready, true)
      assert.deepEqual(checked, [1, 2])
      const item = pending()[0]
      assert.equal(item.game.slug, result.slug)
      assert.equal(item.game.creator_name, 'Fixture Creator')
      assert.deepEqual(item.game.supported_players, [1, 2])
      assert.equal(item.thumbnail, thumbnail.toString('base64'))
      assert.equal(item.delivered.code, result.code)
      assert.equal(item.delivered.transcript, 'offline game idea')
      assert.equal(item.delivered.creator.badgeId, 'offline-badge')
      assert.equal(item.delivered.model, repair ? 'fixture-repair' : 'fixture-build')
      assert.equal(item.delivered.source, repair ? 'repair' : 'build')
      assert.ok(Array.isArray(item.delivered.parts) && Array.isArray(item.delivered.sprites))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})
