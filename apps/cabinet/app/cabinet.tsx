'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { attachBadges, type BadgePlayer, rgb } from './badges'
import { attachKeyboard, attractScript, type InputEvent } from './input'
import { readSse } from './sse'
import { Stt } from './stt'

type Phase = 'ATTRACT' | 'LISTENING' | 'BUILDING' | 'PLAYING' | 'GAMEOVER' | 'FALLBACK'
type Status = 'BUILDING' | 'CHECKING' | 'REPAIRING' | 'READY'
type Players = 1 | 2

interface Spec {
  title: string
  oneLiner: string
  note: string
  players?: Players
  genre?: string
}
interface LibraryGame {
  slug: string
  title: string
  genre: string
  players: number
  code: string
  source: 'library' | 'template'
}
interface Game {
  title: string
  source: string
  slug: string | null
  players: Players
}
interface ScoreEntry {
  id: string
  badgeId: string | null
  name: string
  score: number
  game: { slug: string; title: string }
}
interface SessionPlayer {
  badgeId: string
  name: string
  color: [number, number, number]
  detached: boolean
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
      players: Players
      slug: string
      runId: string
      totalMs: number
    }
  | { type: 'error'; message: string }

interface View {
  phase: Phase
  mode: Players
  transcript: string
  spec: Spec | null
  code: string
  status: Status
  observations: string[]
  game: Game | null
  banner: string | null
  score: number
  scores: number[]
  hi: number
  rtState: string
  error: string | null
  libraryCount: number
  mic: 'idle' | 'on' | 'unavailable'
  badges: BadgePlayer[]
  session: Array<SessionPlayer | null>
  waitingFor2: boolean
  board: { overall: ScoreEntry[]; game: ScoreEntry[] }
}

type Action =
  | { type: 'badges'; badges: BadgePlayer[] }
  | { type: 'session'; session: Array<SessionPlayer | null> }
  | { type: 'mode'; mode: Players }
  | { type: 'phase'; phase: Phase }
  | { type: 'transcript'; transcript: string }
  | { type: 'spec'; spec: Spec }
  | { type: 'token'; text: string }
  | { type: 'status'; status: Status; observations?: string[] }
  | { type: 'game'; game: Game | null; banner?: string | null }
  | { type: 'banner'; banner: string | null }
  | { type: 'score'; score: number; scores: number[]; hi: number; rtState: string }
  | { type: 'error'; error: string | null }
  | { type: 'library'; count: number }
  | { type: 'mic'; mic: View['mic'] }
  | { type: 'waiting2'; waiting: boolean }
  | { type: 'board'; board: Partial<View['board']> }
  | { type: 'resetBuild' }

const initial: View = {
  phase: 'ATTRACT',
  mode: 1,
  transcript: '',
  spec: null,
  code: '',
  status: 'BUILDING',
  observations: [],
  game: null,
  banner: null,
  score: 0,
  scores: [0],
  hi: 0,
  rtState: 'idle',
  error: null,
  libraryCount: 0,
  mic: 'idle',
  badges: [],
  session: [null, null],
  waitingFor2: false,
  board: { overall: [], game: [] },
}

const MAX_CODE_CHARS = 20000
const EXPECTED_CHARS = 6500
const IDLE_MS = 60_000
const ATTRACT_SCRIPT_S = 40
const BOARD_REFRESH_MS = 30_000
const PLAYER_CSS = ['#29adff', '#ff004d'] // the runtime's P1 and P2 colours

function reduce(v: View, a: Action): View {
  switch (a.type) {
    case 'phase':
      return { ...v, phase: a.phase }
    case 'mode':
      return { ...v, mode: a.mode }
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
    case 'banner':
      return { ...v, banner: a.banner }
    case 'score':
      return { ...v, score: a.score, scores: a.scores, hi: a.hi, rtState: a.rtState }
    case 'error':
      return { ...v, error: a.error }
    case 'library':
      return { ...v, libraryCount: a.count }
    case 'mic':
      return { ...v, mic: a.mic }
    case 'badges':
      return { ...v, badges: a.badges }
    case 'session':
      return { ...v, session: a.session }
    case 'waiting2':
      return { ...v, waitingFor2: a.waiting }
    case 'board':
      return { ...v, board: { ...v.board, ...a.board } }
    case 'resetBuild':
      return {
        ...v,
        spec: null,
        code: '',
        status: 'BUILDING',
        observations: [],
        error: null,
        waitingFor2: false,
      }
  }
}

const CRASH_GAME =
  'function init(api){}\nfunction update(api,dt){ if (api.frame > 90) throw new Error("injected crash") }\nfunction draw(api){ api.cls(2); api.textCenter("CRASH TEST", 100, 7) }'

/** Which badge, if any, is player `i` in this mode. 1P: the first badge in. 2P: hub slot i. */
function badgeForPlayer(badges: BadgePlayer[], mode: Players, i: number): BadgePlayer | null {
  if (mode === 1) return i === 0 ? (badges[0] ?? null) : null
  return badges.find((b) => b.slot === i) ?? null
}

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
    (code: string, title: string, players: Players) => {
      seedRef.current = (seedRef.current * 1103515245 + 12345) >>> 0 || 1
      post({ type: 'load', code, seed: seedRef.current, title, hi: 0, players })
    },
    [post],
  )

  // ---- leaderboard -------------------------------------------------------
  const fetchBoard = useCallback(async (slug: string | null) => {
    try {
      const r = await fetch(`/api/scores?game=${encodeURIComponent(slug ?? '')}`)
      const j = (await r.json()) as View['board']
      dispatch({ type: 'board', board: j })
    } catch {}
  }, [])

  const postScores = useCallback(
    async (game: Game, scores: number[]) => {
      if (!game.slug) return
      const { session, mode } = view.current
      const posts: Promise<unknown>[] = []
      for (let i = 0; i < game.players; i++) {
        const who = session[i]
        posts.push(
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              badgeId: who?.badgeId ?? null,
              name: who?.name ?? null,
              score: scores[i] ?? 0,
              players: mode,
              game: { slug: game.slug, title: game.title },
            }),
          }).catch(() => {}),
        )
      }
      await Promise.all(posts)
      await fetchBoard(game.slug)
    },
    [fetchBoard],
  )

  // ---- session: who is playing -------------------------------------------
  // In ATTRACT the session mirrors the badges that have said hello. From
  // LISTENING on, a badge that goes away is kept and marked detached, so a
  // knocked cable never loses a name or a score. Cleared on return to ATTRACT.
  const syncSession = useCallback((badges: BadgePlayer[], mode: Players, phase: Phase) => {
    const prev = view.current.session
    const next: Array<SessionPlayer | null> = [null, null]
    for (let i = 0; i < 2; i++) {
      const b = badgeForPlayer(badges, mode, i)
      if (b) next[i] = { badgeId: b.badgeId, name: b.name, color: b.color, detached: false }
      else if (phase !== 'ATTRACT' && prev[i]) next[i] = { ...prev[i]!, detached: true }
    }
    dispatch({ type: 'session', session: next })
  }, [])

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
    const players: Players = g.players === 2 ? 2 : 1
    dispatch({ type: 'game', game: { title: g.title, source: g.source, slug: g.slug, players } })
    dispatch({ type: 'phase', phase: 'ATTRACT' })
    dispatch({ type: 'waiting2', waiting: false })
    syncSession(view.current.badges, view.current.mode, 'ATTRACT')
    void fetchBoard(null)
    loadGame(g.code, g.title, players)
    const drive = () => {
      post({ type: 'start' })
      post({ type: 'inject', frames: attractScript(ATTRACT_SCRIPT_S) })
    }
    setTimeout(drive, 300)
    attractTimer.current = setInterval(drive, ATTRACT_SCRIPT_S * 1000)
  }, [fetchBoard, loadGame, post, stopAttract, syncSession])

  // ---- build -------------------------------------------------------------
  const crashFallback = useCallback(
    (why: string) => {
      const mode = view.current.mode
      const same = library.current.filter((g) => (g.players === 2 ? 2 : 1) === mode)
      const pool = same.length > 0 ? same : library.current
      const g = pool[Math.floor(Math.random() * pool.length)]
      if (!g) return
      const players: Players = g.players === 2 ? 2 : 1
      dispatch({
        type: 'game',
        game: { title: g.title, source: g.source, slug: g.slug, players },
        banner: `${why}. HERE'S ${g.title}`,
      })
      dispatch({ type: 'phase', phase: 'FALLBACK' })
      loadGame(g.code, g.title, players)
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
      const players = view.current.mode
      dispatch({ type: 'resetBuild' })
      dispatch({ type: 'transcript', transcript })
      dispatch({ type: 'phase', phase: 'BUILDING' })
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, players }),
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
                  game: { title: ev.title, source: 'library', slug: ev.slug, players },
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
                const game: Game = {
                  title: ev.title,
                  source: ev.source,
                  slug: ev.slug,
                  players: ev.players,
                }
                dispatch({ type: 'game', game, banner })
                loadGame(ev.code, ev.title, ev.players)
                lastInput.current = Date.now()
                // Two players, but only one badge has said hello: offer 1P on the stick.
                const ready = view.current.session.filter((p) => p && !p.detached).length
                dispatch({ type: 'waiting2', waiting: ev.players === 2 && ready < 2 })
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
        if (!ev.down) return
        if (ev.button === 'up' || ev.button === 'left') {
          dispatch({ type: 'mode', mode: 1 })
          syncSession(view.current.badges, 1, 'ATTRACT')
        } else if (ev.button === 'down' || ev.button === 'right') {
          dispatch({ type: 'mode', mode: 2 })
          syncSession(view.current.badges, 2, 'ATTRACT')
        } else if (ev.button === 'start') {
          stopAttract()
          post({ type: 'reset' })
          post({ type: 'start' })
          dispatch({ type: 'phase', phase: 'PLAYING' })
        }
        return
      }
      if (phase === 'PLAYING' || phase === 'GAMEOVER' || phase === 'FALLBACK') {
        if (ev.button === 'start' && ev.down) dispatch({ type: 'waiting2', waiting: false })
        post({ type: 'input', player: ev.player, button: ev.button, down: ev.down })
      }
    },
    [post, startListening, stopListening, stopAttract, syncSession],
  )

  useEffect(() => attachKeyboard(onInput), [onInput])

  // Badges: in 1P every badge drives player 0 (docs/badge-integration.md §4);
  // in 2P the hub slot is the player index.
  const onBadgeInput = useCallback(
    (ev: InputEvent) => {
      const mode = view.current.mode
      if (mode === 1) onInput({ ...ev, player: 0 })
      else if (ev.player < 2) onInput(ev)
    },
    [onInput],
  )
  useEffect(
    () =>
      attachBadges({
        onInput: onBadgeInput,
        onRoster: (badges) => {
          dispatch({ type: 'badges', badges })
          syncSession(badges, view.current.mode, view.current.phase)
          if (view.current.waitingFor2 && badges.filter((b) => b.slot < 2).length >= 2)
            dispatch({ type: 'waiting2', waiting: false })
        },
      }),
    [onBadgeInput, syncSession],
  )

  // Dev hooks: F8 injects a crashing game to exercise the fallback path;
  // F1 and F2 plug (or unplug) a fake badge through the real hub.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'F1' || e.code === 'F2') {
        e.preventDefault()
        void fetch('/api/badges/fake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'toggle', n: e.code === 'F1' ? 1 : 2 }),
        }).catch(() => {})
      }
      if (e.code === 'F8') {
        stopAttract()
        dispatch({
          type: 'game',
          game: { title: 'CRASH TEST', source: 'build', slug: null, players: 1 },
        })
        dispatch({ type: 'phase', phase: 'PLAYING' })
        loadGame(CRASH_GAME, 'CRASH TEST', 1)
        setTimeout(() => post({ type: 'start' }), 200)
      }
      // F9 ends the round on screen, so a game over can be reached on demand.
      if (e.code === 'F9') post({ type: 'end' })
      if (e.code === 'Escape') {
        const p = view.current.phase
        if (p === 'LISTENING') cancelListening()
        else if (p === 'PLAYING' || p === 'GAMEOVER' || p === 'FALLBACK') startAttract()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cancelListening, loadGame, post, startAttract, stopAttract])

  // ---- runtime messages --------------------------------------------------
  useEffect(() => {
    const h = (ev: MessageEvent) => {
      const m = ev.data
      if (!m || typeof m.type !== 'string') return
      const { phase, game } = view.current
      if (m.type === 'state') {
        const scores: number[] = Array.isArray(m.scores) ? m.scores : [m.score ?? 0]
        dispatch({
          type: 'score',
          score: m.score ?? 0,
          scores,
          hi: m.hi ?? 0,
          rtState: String(m.state),
        })
        if (phase === 'PLAYING' && (m.state === 'gameover' || m.state === 'win')) {
          dispatch({ type: 'phase', phase: 'GAMEOVER' })
          if (game) void postScores(game, scores)
        }
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
  }, [crashFallback, post, postScores, startAttract])

  // ---- mic warm-up -------------------------------------------------------
  useEffect(() => {
    const s = getStt()
    void s.warmMic().then((ok) => dispatch({ type: 'mic', mic: ok ? 'idle' : 'unavailable' }))
    void s.warmToken()
    const t = setInterval(() => void s.warmToken(), 120_000)
    return () => clearInterval(t)
  }, [getStt])

  // ---- library, board, idle ----------------------------------------------
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

  useEffect(() => {
    const t = setInterval(() => {
      if (view.current.phase === 'ATTRACT') void fetchBoard(null)
    }, BOARD_REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchBoard])

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
  const inGame = v.phase === 'PLAYING' || v.phase === 'GAMEOVER' || v.phase === 'FALLBACK'
  const showWaiting = v.waitingFor2 && v.phase === 'PLAYING' && v.rtState === 'title'
  const slotsToShow = v.mode === 2 ? 2 : 1
  const bothReady = v.session.filter((p) => p && !p.detached).length >= 2

  const board = (title: string, rows: ScoreEntry[], withGame: boolean) => (
    <div className="flex w-[420px] flex-col gap-2 border-4 border-[#83769c] bg-black/85 px-6 py-5 text-[12px]">
      <div className="mb-1 text-[14px] text-[#ffec27]">{title}</div>
      {rows.length === 0 && <div className="text-[#5f574f]">NO SCORES YET. BE THE FIRST.</div>}
      {rows.map((e, i) => (
        <div key={e.id} className="flex gap-3 leading-snug">
          <span className="w-6 text-[#5f574f]">{i + 1}.</span>
          <span className={`flex-1 truncate ${e.badgeId ? 'text-[#fff1e8]' : 'text-[#83769c]'}`}>
            {e.name}
          </span>
          {withGame && <span className="w-32 truncate text-[#5f574f]">{e.game.title}</span>}
          <span className="w-14 text-right text-[#ffa300]">{e.score}</span>
        </div>
      ))}
    </div>
  )

  const roster = (
    <div className="flex flex-col gap-2 text-[14px] drop-shadow-[2px_2px_0_#000]">
      {(['P1', 'P2'] as const).slice(0, slotsToShow).map((tag, i) => {
        const p = v.session[i]
        const colour = p ? rgb(p.color) : '#5f574f'
        const label = p
          ? `${p.name.toUpperCase()}${p.detached ? ' (UNPLUGGED)' : ''}`
          : v.mode === 2
            ? 'PLUG IN A BADGE'
            : 'GUEST'
        return (
          <div key={tag} className="flex items-center gap-3">
            <span
              className="inline-block h-4 w-4 border-2"
              style={{ background: p ? colour : 'transparent', borderColor: PLAYER_CSS[i] }}
            />
            <span style={{ color: p ? colour : '#5f574f' }}>
              {v.mode === 2 ? `${tag} ` : ''}
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )

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
          <div className="absolute top-16 left-8">{roster}</div>
          {v.board.overall.length > 0 && (
            <div className="absolute top-[28%] left-8">
              {board('TOP SCORES', v.board.overall, true)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4">
            <div className="flex gap-6 text-[20px]">
              {([1, 2] as const).map((m) => (
                <div
                  key={m}
                  className={`border-4 px-6 py-3 ${
                    v.mode === m
                      ? 'border-[#ffec27] bg-[#ffec27] text-black'
                      : 'border-[#5f574f] bg-black/80 text-[#c2c3c7]'
                  }`}
                >
                  {m === 1 ? '1 PLAYER' : '2 PLAYERS'}
                </div>
              ))}
            </div>
            <div className="blink border-4 border-[#fff1e8] bg-black/85 px-8 py-5 text-[30px] text-[#fff1e8]">
              HOLD TALK AND SAY A GAME
            </div>
            <div className="text-[14px] text-[#c2c3c7] drop-shadow-[2px_2px_0_#000]">
              {v.mode === 2
                ? 'PLUG IN BOTH BADGES. D-PAD AND A B ON THE BADGE ARE THE CONTROLS'
                : 'PLUG IN YOUR BADGE TO SAVE YOUR SCORE. OR PRESS START TO PLAY THIS ONE'}
            </div>
          </div>
        </>
      )}

      {v.phase !== 'ATTRACT' && v.session.some((p) => p) && (
        <div className="absolute top-6 left-8">{roster}</div>
      )}

      {v.phase === 'LISTENING' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex w-[80vw] max-w-[1100px] flex-col items-center gap-8 border-4 border-[#29adff] bg-black/90 px-12 py-12">
            <div className="flex items-center gap-6 text-[34px] text-[#29adff]">
              <span className="mic" aria-hidden />
              LISTENING
            </div>
            <div className="text-[14px] text-[#c2c3c7]">
              {v.mode === 2 ? 'A GAME FOR TWO PLAYERS' : 'A GAME FOR ONE PLAYER'}
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
                <div className="flex items-baseline gap-6">
                  <div className="text-[44px] leading-tight text-[#ffec27]">{v.spec.title}</div>
                  <div className="text-[16px] text-[#c2c3c7]">
                    {(v.spec.players ?? v.mode) === 2 ? '2 PLAYERS' : '1 PLAYER'}
                  </div>
                </div>
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
            {v.mode === 2 && (
              <div className="text-[12px] text-[#c2c3c7]">
                {bothReady
                  ? 'BOTH BADGES READY'
                  : 'PLUG IN BOTH BADGES AND OPEN ARCADE ON THEM WHILE THIS BUILDS'}
              </div>
            )}
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

      {showWaiting && (
        <div className="absolute inset-x-0 top-[12%] flex justify-center">
          <div className="border-4 border-[#29adff] bg-black/90 px-10 py-6 text-center text-[18px] leading-relaxed text-[#29adff]">
            WAITING FOR PLAYER 2...
            <br />
            <span className="text-[14px] text-[#c2c3c7]">
              PLUG IN A BADGE AND OPEN ARCADE, OR PRESS START TO PLAY 1P ON THE STICK
            </span>
          </div>
        </div>
      )}

      {v.phase === 'GAMEOVER' && v.game?.slug && (
        <div className="absolute top-[18%] right-8">
          {board(`TOP SCORES: ${v.game.title}`, v.board.game, false)}
        </div>
      )}

      {inGame && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-10 text-[12px] text-[#5f574f]">
          <span>{v.game?.title}</span>
          {v.game?.players === 2 && <span>2 PLAYERS</span>}
          <span>HOLD TALK FOR A NEW GAME</span>
          {v.phase === 'GAMEOVER' && <span className="text-[#c2c3c7]">START TO PLAY AGAIN</span>}
        </div>
      )}

      <div className="scanlines pointer-events-none absolute inset-0" aria-hidden />
    </main>
  )
}
