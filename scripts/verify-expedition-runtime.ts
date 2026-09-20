import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assembleCatalog, loadCatalog } from '../packages/harness/src/catalog.ts'
import { openRuntime, closeProbe, probe } from '../packages/probe/src/probe.ts'
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')
try {
  for (const part of loadCatalog().filter((p) =>
    ['arena-survivor', 'dungeon-gauntlet'].includes(p.manifest.id),
  )) {
    const folder = resolve(part.dir, 'verification'),
      source = readFileSync(resolve(part.dir, 'demo.js'), 'utf8'),
      code = assembleCatalog(source, { parts: [part], hash: part.hash, text: part.api }),
      results = []
    for (const players of [1, 2]) {
      const p = await probe(code, {
        players,
        title: part.manifest.title,
        controls: ['up', 'down', 'left', 'right', 'a', 'b'],
        requireIndependentPlayers: players === 2,
      })
      assert.ok(p.ok, JSON.stringify(p.observations))
      results.push({ players, ...p, thumb: undefined })
      const replay = JSON.parse(readFileSync(resolve(folder, `${players}p-replay.json`), 'utf8'))
      assert.equal(replay.moduleHash, sha(readFileSync(resolve(part.dir, 'module.js'))))
      const page = await openRuntime()
      try {
        await page.route('**/*', (r) =>
          r.request().url().startsWith('file:') ? r.continue() : r.abort(),
        )
        await page.evaluate(
          ({ code, players, title }) => {
            const w = window as any
            const loaded = w.__probe.load(code, 7, title, players)
            if (!loaded.ok) throw Error(loaded.error)
            w.__runtime.api.__capture = (s: unknown) => (w.expeditionState = s)
            w.__probe.start()
          },
          {
            code:
              code +
              '\nconst originalDraw=draw;draw=api=>{originalDraw(api);api.__capture?.(game.inspect())};',
            players,
            title: part.manifest.title,
          },
        )
        await page.evaluate((inputs) => window.__probe!.inject(inputs), replay.inputs)
        const samples = [
          { frame: 120, label: 'start' },
          { frame: 420, label: 'combat' },
          ...replay.milestones
            .filter((m: any) => ['upgrade', 'boss'].includes(m.label))
            .filter((m: any, i: number, a: any[]) => a.findIndex((n) => n.label === m.label) === i),
          ...(part.manifest.id === 'dungeon-gauntlet'
            ? [replay.milestones.find((m: any) => m.doors === 1)]
                .filter(Boolean)
                .map((m: any) => ({ ...m, label: 'door' }))
            : []),
          { frame: replay.frames + 1, label: 'victory' },
        ].sort((a, b) => a.frame - b.frame)
        let frame = 0
        const captures = []
        const begin = performance.now()
        for (const sample of samples) {
          const r = await page.evaluate((n) => {
            const w = window as any
            const runtime = w.__probe.step(n)
            return {
              runtime,
              game: w.expeditionState,
              errors: w.__probe.errors(),
              image: w.__probe.snapshot(),
            }
          }, sample.frame - frame)
          frame = sample.frame
          assert.deepEqual(r.errors, [])
          const file = `${players}p-${sample.label}.png`,
            png = Buffer.from(r.image.split(',')[1], 'base64')
          writeFileSync(resolve(folder, file), png)
          captures.push({
            file,
            sha256: sha(png),
            frame,
            runtime: r.runtime,
            phase: r.game.phase,
            stage: r.game.stage,
          })
        }
        const last = await page.evaluate(() => ({
          runtime: (window as any).__probe.step(1),
          game: (window as any).expeditionState,
        }))
        assert.equal(last.runtime.state, 'win')
        assert.deepEqual(last.runtime.scores, replay.expected.scores)
        assert.equal(last.game.stage, replay.final.stage)
        assert.deepEqual(last.game.events, replay.final.events)
        const reset = await page.evaluate(() => {
          const w = window as any
          w.__probe.reset()
          w.__probe.start()
          return { runtime: w.__probe.step(1), game: w.expeditionState }
        })
        assert.equal(reset.game.stage, 1)
        assert.equal(reset.game.phase, 'play')
        assert.deepEqual(reset.runtime.scores, Array(players).fill(0))
        assert.ok(reset.game.people.every((p: any) => p.hp === 6 && !p.down))
        writeFileSync(
          resolve(folder, `${players}p-native.json`),
          JSON.stringify(
            {
              contentHash: part.hash,
              passed: true,
              players,
              frames: replay.frames,
              elapsedMs: Math.round(performance.now() - begin),
              captures,
              final: last,
              reset: {
                state: reset.runtime.state,
                scores: reset.runtime.scores,
                stage: reset.game.stage,
              },
            },
            null,
            2,
          ),
        )
        console.log(
          JSON.stringify({
            id: part.manifest.id,
            players,
            passed: true,
            seconds: replay.final.totalTime,
            scores: last.runtime.scores,
            captures: captures.length,
          }),
        )
      } finally {
        await page.close()
      }
    }
    writeFileSync(
      resolve(folder, 'runtime.json'),
      JSON.stringify({ contentHash: part.hash, results }, null, 2),
    )
  }
} finally {
  await closeProbe()
}
