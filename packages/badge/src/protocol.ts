// The badge side of the wire is packages/badge/app/main.lua. This file is the
// Mac side: pure parsing of the lines the firmware prints, nothing else.

export const APP_SLUG = 'arcade'
export const APP_VERSION = '10'

export const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start'] as const
export type Button = (typeof BUTTONS)[number]

/** Button codes seen on firmware v0.1.2-392. The app logs its own map on enter. */
export const DEFAULT_BUTTON_MAP: Record<number, string> = {
  0: 'a',
  1: 'b',
  2: 'home',
  3: 'down',
  4: 'left',
  5: 'right',
  6: 'up',
  7: 'aux1',
  8: 'start',
}

export interface Identity {
  badgeId: string
  name: string
  color: [number, number, number]
}

export type BadgeLine =
  | { kind: 'hello'; at: number; identity: Identity }
  | { kind: 'map'; at: number; map: Record<number, string> }
  | { kind: 'button'; at: number; code: number; down: boolean }
  | { kind: 'bye'; at: number }
  | { kind: 'log'; at: number; text: string }

// "I (94604) lua: [arcade] ARCADE HELLO quiet-phoenix-noble-bold Tony Pan 76 175 80"
const LUA_LINE = /^I \((\d+)\) lua: \[([\w-]+)\] (.*)$/

/**
 * Parse one serial line. Returns null for anything not from our app. The
 * console prompt has no trailing newline, so a log line can arrive as
 * "badge> I (…) lua: …"; leading prompts are stripped first.
 */
export function parseLine(line: string, slug = APP_SLUG): BadgeLine | null {
  const m = LUA_LINE.exec(line.replace(/^(\s*badge> )+/, '').trim())
  if (!m || m[2] !== slug) return null
  const at = Number(m[1])
  const text = m[3] ?? ''
  const hello = /^ARCADE HELLO (\S+) (.+) (\d+) (\d+) (\d+)$/.exec(text)
  if (hello)
    return {
      kind: 'hello',
      at,
      identity: {
        badgeId: hello[1]!,
        name: hello[2]!.trim(),
        color: [Number(hello[3]), Number(hello[4]), Number(hello[5])],
      },
    }
  if (text.startsWith('ARCADE MAP ')) return { kind: 'map', at, map: parseMap(text.slice(11)) }
  if (text === 'ARCADE BYE') return { kind: 'bye', at }
  const btn = /^B (\d+) ([01])$/.exec(text)
  if (btn) return { kind: 'button', at, code: Number(btn[1]), down: btn[2] === '1' }
  return { kind: 'log', at, text }
}

/** "UP=6 DOWN=3 A=0" -> { 6: 'up', 3: 'down', 0: 'a' } */
export function parseMap(s: string): Record<number, string> {
  const map: Record<number, string> = {}
  for (const pair of s.trim().split(/\s+/)) {
    const [name, code] = pair.split('=')
    if (!name || code === undefined) continue
    const n = Number(code)
    if (Number.isFinite(n)) map[n] = name.toLowerCase()
  }
  return map
}

/** Map a button code to a runtime button name, or null for HOME, AUX1 and unknowns. */
export function buttonName(code: number, map: Record<number, string>): Button | null {
  const name = map[code] ?? DEFAULT_BUTTON_MAP[code]
  return name && (BUTTONS as readonly string[]).includes(name) ? (name as Button) : null
}

/**
 * The app puts "id=<badge_id> rgb=<r>,<g>,<b>" and the holder's name on
 * screen. `uitree` prints every label, so a badge that is already in the
 * app when it is plugged in can be identified without a fresh HELLO.
 */
export function identityFromUitree(dump: string): Identity | null {
  const meta = /text="id=(\S+) rgb=(\d+),(\d+),(\d+)"/.exec(dump)
  if (!meta) return null
  const labels = [...dump.matchAll(/text="([^"]*)"/g)].map((x) => x[1] ?? '')
  // Labels print in creation order: title, name, status, meta.
  const i = labels.findIndex((label) => label === 'ARCADE' || label === 'HTN ARCADE')
  const name = i >= 0 ? (labels[i + 1] ?? '') : ''
  return {
    badgeId: meta[1]!,
    name: name || meta[1]!,
    color: [Number(meta[2]), Number(meta[3]), Number(meta[4])],
  }
}

/** "version=1" from a manifest.cfg dump, or null. */
export function manifestVersion(dump: string): string | null {
  const m = /^version=(\S+)\s*$/m.exec(dump)
  return m ? m[1]! : null
}
