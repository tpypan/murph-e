'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { attachKeyboard, attractScript, type InputEvent } from './input'
import { readSse } from './sse'
import { Stt } from './stt'

type Phase = 'ATTRACT' | 'LISTENING' | 'BUILDING' | 'PLAYING' | 'GAMEOVER' | 'FALLBACK'
type Status = 'BUILDING' | 'CHECKING' | 'REPAIRING' | 'READY'

interface Spec {
  title: string
  oneLiner: string
  note: string
}
interface LibraryGame {
  slug: string
  title: string
  genre: string
  code: string
  source: 'library' | 'template'
}
type PipelineEvent =
  | { type: 'spec'; spec: Spec; ms: number }
  | { type: 'token'; text: string; variant: number }
  | { type: 'built'; variant: number; ms: number; tokens: number; syntaxError: string | null }
  | { type: 'probe'; variant: number; ok: boolean; observations: string[]; ms: number }
  | { type: 'repair'; phase: 'start' | 'done'; ok?: boolean; observations?: string[] }
  | { type: 'fallback'; reason: string; title: string; slug: string }
  | {
      type: 'ready'
      code: string
      title: string
      note: string
      source: string
      runId: string
      totalMs: number
    }
  | { type: 'error'; message: string }

interface View {
  phase: Phase
  transcript: string
  spec: Spec | null
  code: string
  status: Status
  observations: string[]
  game: { title: string; source: string } | null
  banner: string | null
  score: number
  hi: number
  error: string | null
  libraryCount: number
  mic: 'idle' | 'on' | 'unavailable'
}

type Action =
  | { type: 'phase'; phase: Phase }
  | { type: 'transcript'; transcript: string }
  | { type: 'spec'; spec: Spec }
  | { type: 'token'; text: string }
  | { type: 'status'; status: Status; observations?: string[] }
  | { type: 'game'; game: View['game']; banner?: string | null }
  | { type: 'score'; score: number; hi: number }
  | { type: 'error'; error: string | null }
  | { type: 'library'; count: number }
  | { type: 'mic'; mic: View['mic'] }
  | { type: 'resetBuild' }

const initial: View = {
  phase: 'ATTRACT',
  transcript: '',
  spec: null,
  code: '',
  status: 'BUILDING',
  observations: [],
  game: null,
  banner: null,
  score: 0,
  hi: 0,
  error: null,
  libraryCount: 0,
  mic: 'idle',
}

const MAX_CODE_CHARS = 20000
const EXPECTED_CHARS = 6500
const IDLE_MS = 60_000
const ATTRACT_SCRIPT_S = 40

function reduce(v: View, a: Action): View {
  switch (a.type) {
    case 'phase':
      return { ...v, phase: a.phase }
    case 'transcript':
      return { ...v, transcript: a.transcript }
    case 'spec':
      return { ...v, spec: a.spec }
    case 'token':
      return { ...v, code: (v.code + a.text).slice(-MAX_CODE_CHARS) }
    case 'status':
      return { ...v, status: a.status, observations: a.observations ?? v.observations }
    case 'game':
      return { ...v, game: a.game, banner: a.banner ?? null }
    case 'score':
      return { ...v, score: a.score, hi: a.hi }
    case 'error':
      return { ...v, error: a.error }
    case 'library':
      return { ...v, libraryCount: a.count }
    case 'mic':
      return { ...v, mic: a.mic }
    case 'resetBuild':
      return { ...v, spec: null, code: '', status: 'BUILDING', observations: [], error: null }
  }
}

const CRASH_GAME =
  'function init(api){}\nfunction update(api,dt){ if (api.frame > 90) throw new Error("injected crash") }\nfunction draw(api){ api.cls(2); api.textCenter("CRASH TEST", 100, 7) }'

export default function Cabinet() {
  const [v, dispatch] = useReducer(reduce, initial)
  const view = useRef(v)
  view.current = v
  const frame = useRef<HTMLIFrameElement>(null)
  const library = useRef<LibraryGame[]>([])
  const lastInput = useRef(Date.now())
  const attractTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const inputEl = useRef<HTMLInputElement>(null)
  const seedRef = useRef(1)
  const stt = useRef<Stt | null>(null)
  const getStt = useCallback(() => {
    if (!stt.current) stt.current = new Stt()
    return stt.current
  }, [])

  const post = useCallback((msg: unknown) => {
    frame.current?.contentWindow?.postMessage(msg, '*')
  }, [])

  const loadGame = useCallback(
    (code: string, title: string) => {
      seedRef.current = (seedRef.current * 1103515245 + 12345) >>> 0 || 1
      post({ type: 'load', code, seed: seedRef.current, title, hi: 0 })
    },
    [post],
  )

  // ---- attract -----------------------------------------------------------
  const stopAttract = useCallback(() => {
    if (attractTimer.current) clearInterval(attractTimer.current)
    attractTimer.current = null
  }, [])

  const startAttract = useCallback(() => {
    stopAttract()
    const pool = library.current
    if (pool.length === 0) return
    const g = pool[Math.floor(Math.random() * pool.length)]!
    dispatch({ type: 'game', game: { title: g.title, source: g.source } })
    dispatch({ type: 'phase', phase: 'ATTRACT' })
    loadGame(g.code, g.title)
    const drive = () => {
      post({ type: 'start' })
      post({ type: 'inject', frames: attractScript(ATTRACT_SCRIPT_S) })
    }
    setTimeout(drive, 300)
    attractTimer.current = setInterval(drive, ATTRACT_SCRIPT_S * 1000)
  }, [loadGame, post, stopAttract])

  // ---- build -------------------------------------------------------------
  const crashFallback = useCallback(
    (why: string) => {
      const pool = library.current
      if (pool.length === 0) return
      const g = pool[Math.floor(Math.random() * pool.length)]!
      dispatch({
        type: 'game',
        game: { title: g.title, source: g.source },
        banner: `${why}. HERE'S ${g.title}`,
      })
      dispatch({ type: 'phase', phase: 'FALLBACK' })
      loadGame(g.code, g.title)
      setTimeout(() => {
        if (view.current.phase === 'FALLBACK') dispatch({ type: 'phase', phase: 'PLAYING' })
      }, 2500)
    },
    [loadGame],
  )

  const build = useCallback(
    async (transcript: string) => {
      stopAttract()
      abort.current?.abort()
      const ac = new AbortController()
      abort.current = ac
      dispatch({ type: 'resetBuild' })
      dispatch({ type: 'transcript', transcript })
      dispatch({ type: 'phase', phase: 'BUILDING' })
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
          signal: ac.signal,
        })
        await readSse<PipelineEvent>(
          res,
          (ev) => {
            switch (ev.type) {
              case 'spec':
                dispatch({ type: 'spec', spec: ev.spec })
                break
              case 'token':
                if (ev.variant === 0) dispatch({ type: 'token', text: ev.text })
                break
              case 'built':
                if (ev.variant === 0) dispatch({ type: 'status', status: 'CHECKING' })
                break
              case 'probe':
                if (!ev.ok)
                  dispatch({ type: 'status', status: 'CHECKING', observations: ev.observations })
                break
              case 'repair':
                dispatch({
                  type: 'status',
                  status: ev.phase === 'start' ? 'REPAIRING' : 'CHECKING',
                  observations: ev.observations,
                })
                break
              case 'fallback':
                dispatch({
                  type: 'game',
                  game: { title: ev.title, source: 'library' },
                  banner: `COULDN'T BUILD THAT ONE. HERE'S ${ev.title}`,
                })
                break
              case 'ready': {
                dispatch({ type: 'status', status: 'READY' })
                const fromLibrary = ev.source === 'library' || ev.source === 'template'
                const banner = fromLibrary
                  ? `COULDN'T BUILD THAT ONE. HERE'S ${ev.title}`
                  : ev.note
                    ? ev.note
                    : null
                dispatch({ type: 'game', game: { title: ev.title, source: ev.source }, banner })
                loadGame(ev.code, ev.title)
                lastInput.current = Date.now()
                if (banner) {
                  dispatch({ type: 'phase', phase: 'FALLBACK' })
                  setTimeout(() => {
                    if (view.current.phase === 'FALLBACK')
                      dispatch({ type: 'phase', phase: 'PLAYING' })
                  }, 2500)
                } else dispatch({ type: 'phase', phase: 'PLAYING' })
                break
              }
              case 'error':
                dispatch({ type: 'error', error: ev.message })
                break
            }
          },
          ac.signal,
        )
      } catch (e) {
        if (ac.signal.aborted) return
        dispatch({ type: 'error', error: e instanceof Error ? e.message : String(e) })
        // The server is unreachable or crashed: never dead-end.
        crashFallback("COULDN'T REACH THE BUILDER")
      }
    },
    [crashFallback, loadGame, stopAttract],
  )

  // ---- listening ---------------------------------------------------------
  const startListening = useCallback(() => {
    stopAttract()
    abort.current?.abort()
    dispatch({ type: 'transcript', transcript: '' })
    dispatch({ type: 'error', error: null })
    dispatch({ type: 'phase', phase: 'LISTENING' })
    const s = getStt()
    if (s.hasMic()) {
      dispatch({ type: 'mic', mic: 'on' })
      void s.start({
        onText: (committed, partial) => {
          if (view.current.phase !== 'LISTENING') return
          dispatch({ type: 'transcript', transcript: `${committed} ${partial}`.trim() })
        },
        onState: (state, detail) => {
          if (state === 'error') {
            dispatch({ type: 'mic', mic: 'unavailable' })
            dispatch({ type: 'error', error: `MIC: ${detail ?? 'error'}` })
            setTimeout(() => inputEl.current?.focus(), 50)
          }
        },
      })
    } else {
      dispatch({ type: 'mic', mic: 'unavailable' })
      setTimeout(() => inputEl.current?.focus(), 50)
    }
  }, [getStt, stopAttract])

  const stopListening = useCallback(async () => {
    const s = getStt()
    let t = view.current.transcript.trim()
    if (s.hasMic()) {
      dispatch({ type: 'mic', mic: 'idle' })
      const heard = await s.stop()
      if (view.current.phase !== 'LISTENING') return
      if (heard) t = heard
      dispatch({ type: 'transcript', transcript: t })
    }
    if (t) build(t)
    else {
      // Nothing heard: stay in LISTENING with the typed fallback visible.
      dispatch({ type: 'error', error: "DIDN'T CATCH THAT. HOLD TALK AND TRY AGAIN, OR TYPE IT." })
      setTimeout(() => inputEl.current?.focus(), 50)
    }
  }, [build, getStt])

  const cancelListening = useCallback(() => {
    if (view.current.game && view.current.phase === 'LISTENING') {
      dispatch({ type: 'phase', phase: 'PLAYING' })
      post({ type: 'reset' })
    } else startAttract()
  }, [post, startAttract])

  // ---- input -------------------------------------------------------------
  const onInput = useCallback(
    (ev: InputEvent) => {
      lastInput.current = Date.now()
      const phase = view.current.phase
      if (ev.button === 'talk') {
        if (ev.down && phase !== 'BUILDING' && phase !== 'LISTENING') startListening()
        else if (!ev.down && phase === 'LISTENING') stopListening()
        return
      }
      if (phase === 'ATTRACT') {
        if (ev.button === 'start' && ev.down) {
          stopAttract()
          post({ type: 'reset' })
          post({ type: 'start' })
          dispatch({ type: 'phase', phase: 'PLAYING' })
        }
        return
      }
      if (phase === 'PLAYING' || phase === 'GAMEOVER' || phase === 'FALLBACK') {
        post({ type: 'input', player: ev.player, button: ev.button, down: ev.down })
      }
    },
    [post, startListening, stopListening, stopAttract],
  )

  useEffect(() => attachKeyboard(onInput), [onInput])

  // Dev hooks: F8 injects a crashing game to exercise the fallback path.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'F8') {
        stopAttract()
        dispatch({ type: 'game', game: { title: 'CRASH TEST', source: 'build' } })
        dispatch({ type: 'phase', phase: 'PLAYING' })
        loadGame(CRASH_GAME, 'CRASH TEST')
        setTimeout(() => post({ type: 'start' }), 200)
      }
      if (e.code === 'Escape' && view.current.phase === 'LISTENING') cancelListening()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cancelListening, loadGame, post, stopAttract])

  // ---- runtime messages --------------------------------------------------
  useEffect(() => {
    const h = (ev: MessageEvent) => {
      const m = ev.data
      if (!m || typeof m.type !== 'string') return
      const phase = view.current.phase
      if (m.type === 'state') {
        dispatch({ type: 'score', score: m.score ?? 0, hi: m.hi ?? 0 })
        if (phase === 'PLAYING' && (m.state === 'gameover' || m.state === 'win'))
          dispatch({ type: 'phase', phase: 'GAMEOVER' })
        if (phase === 'GAMEOVER' && m.state === 'playing')
          dispatch({ type: 'phase', phase: 'PLAYING' })
        if (phase === 'ATTRACT' && (m.state === 'gameover' || m.state === 'win')) {
          setTimeout(() => {
            if (view.current.phase !== 'ATTRACT') return
            post({ type: 'start' })
            post({ type: 'inject', frames: attractScript(ATTRACT_SCRIPT_S) })
          }, 1500)
        }
      } else if (m.type === 'error') {
        if (phase === 'PLAYING' || phase === 'GAMEOVER' || phase === 'FALLBACK')
          crashFallback('THAT GAME CRASHED')
        else if (phase === 'ATTRACT') startAttract()
      }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [crashFallback, post, startAttract])

  // ---- mic warm-up -------------------------------------------------------
  useEffect(() => {
    const s = getStt()
    void s.warmMic().then((ok) => dispatch({ type: 'mic', mic: ok ? 'idle' : 'unavailable' }))
    void s.warmToken()
    const t = setInterval(() => void s.warmToken(), 120_000)
    return () => clearInterval(t)
  }, [getStt])

  // ---- library + idle ----------------------------------------------------
  useEffect(() => {
    let cancelled = false
    fetch('/api/library')
      .then((r) => r.json())
      .then((j: { games: LibraryGame[] }) => {
        if (cancelled) return
        library.current = j.games
        dispatch({ type: 'library', count: j.games.filter((g) => g.source === 'library').length })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // The iframe src is set after mount so its load event cannot fire before
  // the handlers below exist (it did, during hydration).
  const [frameSrc, setFrameSrc] = useState<string | undefined>(undefined)
  useEffect(() => setFrameSrc('/runtime/index.html'), [])
  const onFrameLoad = useCallback(() => {
    const tryStart = () => {
      if (library.current.length > 0) startAttract()
      else setTimeout(tryStart, 200)
    }
    tryStart()
  }, [startAttract])

  useEffect(() => {
    const t = setInterval(() => {
      const p = view.current.phase
      if ((p === 'PLAYING' || p === 'GAMEOVER') && Date.now() - lastInput.current > IDLE_MS)
        startAttract()
    }, 1000)
    return () => clearInterval(t)
  }, [startAttract])

  // ---- render ------------------------------------------------------------
  const dim = v.phase === 'LISTENING' || v.phase === 'BUILDING'
  const progress = v.status === 'READY' ? 1 : Math.min(0.95, v.code.length / EXPECTED_CHARS)
  const codeTail = v.code.split('\n').slice(-18).join('\n')

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white select-none">
      <iframe
        ref={frame}
        title="game"
        src={frameSrc}
        sandbox="allow-scripts"
        allow="autoplay"
        onLoad={onFrameLoad}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${dim ? 'opacity-20' : 'opacity-100'}`}
      />

      {v.phase === 'ATTRACT' && (
        <>
          <div className="absolute top-6 left-8 text-[18px] text-[#ffec27] drop-shadow-[3px_3px_0_#000]">
            HTN ARCADE
          </div>
          <div className="absolute top-6 right-8 text-[14px] text-[#c2c3c7] drop-shadow-[3px_3px_0_#000]">
            NOW PLAYING: {v.game?.title}
          </div>
          <div className="absolute inset-x-0 bottom-14 flex flex-col items-center gap-5">
            <div className="blink bg-black/85 px-8 py-5 text-[30px] text-[#fff1e8] border-4 border-[#fff1e8]">
              HOLD TALK AND SAY A GAME
            </div>
            <div className="text-[14px] text-[#c2c3c7] drop-shadow-[2px_2px_0_#000]">
              OR PRESS START TO PLAY THIS ONE
            </div>
          </div>
        </>
      )}

      {v.phase === 'LISTENING' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex w-[80vw] max-w-[1100px] flex-col items-center gap-8 border-4 border-[#29adff] bg-black/90 px-12 py-12">
            <div className="flex items-center gap-6 text-[34px] text-[#29adff]">
              <span className="mic" aria-hidden />
              LISTENING
            </div>
            <div className="min-h-[3em] text-center text-[24px] leading-relaxed text-[#fff1e8]">
              {v.transcript || (
                <span className="text-[#5f574f]">SAY A GAME. LET GO OF TALK WHEN DONE.</span>
              )}
            </div>
            {v.error && <div className="text-center text-[14px] text-[#ff77a8]">{v.error}</div>}
            {v.mic !== 'on' && (
              <form
                className="flex w-full gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const t = view.current.transcript.trim()
                  if (t) build(t)
                }}
              >
                <input
                  ref={inputEl}
                  value={v.transcript}
                  onChange={(e) => dispatch({ type: 'transcript', transcript: e.target.value })}
                  placeholder="OR TYPE IT HERE AND PRESS ENTER"
                  className="w-full border-2 border-[#5f574f] bg-black px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#5f574f] focus:border-[#29adff]"
                />
              </form>
            )}
            <div className="text-[12px] text-[#5f574f]">ESC TO CANCEL</div>
          </div>
        </div>
      )}

      {v.phase === 'BUILDING' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex w-[86vw] max-w-[1200px] flex-col gap-6 border-4 border-[#ffa300] bg-black/92 px-12 py-10">
            <div className="text-[14px] text-[#c2c3c7]">YOU SAID: {v.transcript.toUpperCase()}</div>
            {v.spec ? (
              <>
                <div className="text-[44px] leading-tight text-[#ffec27]">{v.spec.title}</div>
                <div className="text-[18px] leading-relaxed text-[#fff1e8]">
                  {v.spec.oneLiner.toUpperCase()}
                </div>
                {v.spec.note && <div className="text-[14px] text-[#ff77a8]">{v.spec.note}</div>}
              </>
            ) : (
              <div className="blink text-[30px] text-[#ffec27]">THINKING...</div>
            )}
            <div className="flex items-center gap-6">
              <div className="w-[240px] text-[18px] text-[#ffa300]">
                {v.status === 'READY' ? 'READY!' : `${v.status}...`}
              </div>
              <div className="h-6 flex-1 border-2 border-[#ffa300] p-[3px]">
                <div
                  className="h-full bg-[#ffa300] transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
            {v.observations.length > 0 && v.status === 'REPAIRING' && (
              <div className="text-[12px] leading-relaxed text-[#ff77a8]">
                FIXING: {v.observations.join(' / ').toUpperCase()}
              </div>
            )}
            <pre className="h-[34vh] overflow-hidden whitespace-pre-wrap break-all font-mono text-[12px] leading-[1.35] text-[#00e436]/80">
              {codeTail}
              <span className="blink">_</span>
            </pre>
            {v.error && <div className="text-[12px] text-[#ff004d]">{v.error.toUpperCase()}</div>}
          </div>
        </div>
      )}

      {v.phase === 'FALLBACK' && v.banner && (
        <div className="absolute inset-x-0 top-[12%] flex justify-center">
          <div className="border-4 border-[#ff77a8] bg-black/90 px-10 py-6 text-center text-[22px] leading-relaxed text-[#ff77a8]">
            {v.banner}
          </div>
        </div>
      )}

      {(v.phase === 'PLAYING' || v.phase === 'GAMEOVER') && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-10 text-[12px] text-[#5f574f]">
          <span>{v.game?.title}</span>
          <span>HOLD TALK FOR A NEW GAME</span>
          {v.phase === 'GAMEOVER' && <span className="text-[#c2c3c7]">START TO PLAY AGAIN</span>}
        </div>
      )}

      <div className="scanlines pointer-events-none absolute inset-0" aria-hidden />
    </main>
  )
}
