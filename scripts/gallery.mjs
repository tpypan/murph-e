#!/usr/bin/env node
// Writes library/gallery.html: every library game with its thumbnail, spec
// and a link that opens it in the runtime dev page. Run: pnpm gallery
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const dir = resolve(root, 'library/games')
const games = readdirSync(dir)
  .filter((d) => existsSync(resolve(dir, d, 'game.js')))
  .map((slug) => {
    const specPath = resolve(dir, slug, 'spec.json')
    const spec = existsSync(specPath) ? JSON.parse(readFileSync(specPath, 'utf8')) : {}
    const transcript =
      spec.runId && existsSync(resolve(root, 'runs', spec.runId, 'transcript.txt'))
        ? readFileSync(resolve(root, 'runs', spec.runId, 'transcript.txt'), 'utf8').trim()
        : ''
    return {
      slug,
      spec,
      transcript,
      lines: readFileSync(resolve(dir, slug, 'game.js'), 'utf8').split('\n').length,
    }
  })
  .sort(
    (a, b) =>
      (a.spec.genre ?? '').localeCompare(b.spec.genre ?? '') || a.slug.localeCompare(b.slug),
  )

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
const card = (g) => `
<a class="card" href="/packages/runtime/dev.html?game=${encodeURIComponent(`/library/games/${g.slug}/game.js`)}">
  <img src="/library/games/${g.slug}/thumb.png" width="256" height="224" alt="" />
  <div class="title">${esc(g.spec.title ?? g.slug)} <span class="genre">${esc(g.spec.genre ?? '')}</span></div>
  <div class="said">${esc(g.transcript ? `"${g.transcript}"` : '')}</div>
  <div class="line">${esc(g.spec.oneLiner ?? '')}</div>
  <div class="meta">${g.lines} lines${g.spec.note ? ` · ${esc(g.spec.note)}` : ''}</div>
</a>`

writeFileSync(
  resolve(root, 'library/gallery.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HTN Arcade library</title>
<style>
body{background:#111;color:#ddd;font:13px/1.4 ui-monospace,Menlo,monospace;margin:0;padding:20px}
h1{font-size:16px;margin:0 0 4px}p{margin:0 0 16px;color:#888}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:14px}
.card{display:block;background:#000;border:2px solid #333;padding:6px;color:inherit;text-decoration:none}
.card:hover{border-color:#ffec27}
img{image-rendering:pixelated;display:block;width:256px;height:224px;margin:0 auto 6px;background:#000}
.title{color:#ffec27;text-transform:uppercase;font-weight:bold}.genre{color:#888;font-weight:normal;float:right}
.said{color:#29adff;margin-top:4px;min-height:1.4em}.line{margin-top:4px}.meta{color:#666;margin-top:4px}
</style></head><body>
<h1>HTN Arcade library: ${games.length} games</h1>
<p>Click a card to play it in the runtime dev page (arrows, Z = A, X = B, Enter = START).</p>
<div class="grid">${games.map(card).join('')}</div>
</body></html>`,
)
console.log(`library/gallery.html: ${games.length} games`)
