// The runtime's probe hook, as seen from Playwright's page.evaluate.
interface ProbeHook {
  load: (code: string, seed?: number, title?: string) => { ok: boolean; error?: string }
  start: () => void
  reset: () => void
  step: (n?: number) => { state: string; score: number; frame: number; error: string | null }
  frameHash: () => string
  frameStats: () => { colors: number; dominant: number; dominantShare: number }
  state: () => string
  score: () => number
  inject: (frames: Array<{ at: number; player?: number; button: string; down: boolean }>) => void
  input: (player: number, button: string, down: boolean) => void
  errors: () => Array<{ message: string; stack: string; phase: string }>
  snapshot: () => string
}
interface Window {
  __probe?: ProbeHook
}
