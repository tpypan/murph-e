'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { attachBadges, type BadgePlayer } from './badges'
import { BuildConsole, type BuildStatus } from './build-console'
import { GameControls } from './game-controls'
import { classifyGenerationError } from './generation-error'
import { type DemoGame, type HomeHandle, HomeScreen } from './home-screen'
import { attachKeyboard, type InputEvent } from './input'
import { Panel } from './panel'
import { readSse } from './sse'
import { Stt } from './stt'
import { textPages, VoiceInput, type VoiceStage } from './voice-input'

type Phase =
  | 'ATTRACT'
  | 'READY'
  | 'OPTIONS'
  | 'LISTENING'
  | 'BUILDING'
  | 'PLAYING'
  | 'GAMEOVER'
  | 'FALLBACK'
type Status = BuildStatus
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
  spec: Record<string, unknown> | null
  source: 'library' | 'template'
}
/** The prepared game and its instructions, retained for replay and resume. */
interface CurrentGame {
  code: string
  spec: Record<string, unknown>
  slug: string
  title: string
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
  | { type: 'foundation'; prefix: string; demo: string }
  | { type: 'token'; text: string; variant: number; stage?: 'build' | 'repair' }
  | { type: 'built'; variant: number; ms: number; tokens: number; syntaxError: string | null }
  | { type: 'probe'; variant: number; ok: boolean; observations: string[]; ms: number }
  | { type: 'repair'; phase: 'start' | 'done'; ok?: boolean; observations?: string[] }
  | { type: 'fallback'; reason: string; title: string; slug: string }
  | {
      type: 'ready'
      code: string
      title: string
      note: string
      spec: Record<string, unknown> | null
      source: string
      players: Players
      slug: string
      runId: string
      totalMs: number
    }
  | { type: 'error'; message: string; terminal?: boolean }

interface View {
  phase: Phase
  mode: Players
  transcript: string
  spec: Spec | null
  code: string
  foundation: { prefix: string; demo: string } | null
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
  voiceStage: VoiceStage
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
  | { type: 'foundation'; prefix: string; demo: string }
  | { type: 'clearDraft' }
  | { type: 'status'; status: Status; observations?: string[] }
  | { type: 'game'; game: Game | null; banner?: string | null }
  | { type: 'banner'; banner: string | null }
  | { type: 'score'; score: number; scores: number[]; hi: number; rtState: string }
  | { type: 'error'; error: string | null }
  | { type: 'library'; count: number }
  | { type: 'voice'; stage: VoiceStage }
  | { type: 'waiting2'; waiting: boolean }
  | { type: 'board'; board: Partial<View['board']> }
  | { type: 'resetBuild' }

const initial: View = {
  phase: 'ATTRACT',
  mode: 1,
  transcript: '',
  spec: null,
  code: '',
  foundation: null,
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
  voiceStage: 'ready',
  badges: [],
  session: [null, null],
  waitingFor2: false,
  board: { overall: [], game: [] },
}

const MAX_CODE_CHARS = 64000
const IDLE_MS = 60_000
const BOARD_REFRESH_MS = 30_000

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
      return {
        ...v,
        code: (v.code + a.text).slice(-MAX_CODE_CHARS),
      }
    case 'clearDraft':
      return { ...v, code: '' }
    case 'foundation':
      return { ...v, foundation: { prefix: a.prefix, demo: a.demo } }
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
    case 'voice':
      return { ...v, voiceStage: a.stage }
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
        foundation: null,
        status: 'CONNECTING',
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
  const home = useRef<HomeHandle>(null)
  const rememberedHome = useRef<{ id?: string; players: Players }>({ players: 1 })
  const rememberHome = useCallback((id: string, players: Players) => {
    rememberedHome.current = { id, players }
  }, [])
  const library = useRef<LibraryGame[]>([])
  const lastInput = useRef(Date.now())
  const abort = useRef<AbortController | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const listeningFrom = useRef<Phase>('ATTRACT')
  const [selection, setSelection] = useState(0)
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const [page, setPage] = useState(0)
  const [sound, setSound] = useState(true)
  // F3 shows the simulated cabinet panel (docs/design-guide.md, Physical input).
  const [showPanel, setShowPanel] = useState(false)
  // ?cabinet=1 (set by scripts/kiosk.sh): the keycaps on screen are the panel's
  // own letters instead of the keyboard hints a developer sees.
  const [cabinet, setCabinet] = useState(false)
  const cabinetRef = useRef(false)
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).get('cabinet') === '1'
    cabinetRef.current = on
    setCabinet(on)
  }, [])
  const screen = useRef<HTMLElement>(null)
  const fullscreen = useCallback(() => {
    const task = document.fullscreenElement
      ? document.exitFullscreen()
      : screen.current?.requestFullscreen()
    void task?.catch(() =>
      dispatch({ type: 'error', error: 'Fullscreen unavailable. Use browser kiosk mode.' }),
    )
  }, [])
  const seedRef = useRef(1)
  // Preserve the current game for its controls, replay and resume.
  const current = useRef<CurrentGame | null>(null)
  const stt = useRef<Stt | null>(null)
  const talkHeld = useRef(false)
  const listeningAttempt = useRef(0)
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
  const playDemo = useCallback(
    (game: DemoGame, players: Players) => {
      const slug = `demo-${game.id}`
      current.current = { code: game.code, spec: game.spec, slug, title: game.title }
      dispatch({ type: 'mode', mode: players })
      syncSession(view.current.badges, players, 'ATTRACT')
      dispatch({
        type: 'game',
        game: { title: game.title, source: 'demo', slug, players },
        banner: null,
      })
      dispatch({ type: 'error', error: null })
      dispatch({ type: 'waiting2', waiting: false })
      loadGame(game.code, game.title, players)
      dispatch({ type: 'phase', phase: 'READY' })
    },
    [loadGame, syncSession],
  )

  const startAttract = useCallback(() => {
    abort.current?.abort()
    post({ type: 'pause', paused: true })
    dispatch({ type: 'phase', phase: 'ATTRACT' })
    dispatch({ type: 'waiting2', waiting: false })
    setSelection(0)
    void fetchBoard(null)
  }, [fetchBoard, post])

  // ---- build -------------------------------------------------------------
  const crashFallback = useCallback(
    (why: string) => {
      const mode = view.current.mode
      const same = library.current.filter((g) => (g.players === 2 ? 2 : 1) === mode)
      const pool = same.length > 0 ? same : library.current
      const g = pool[Math.floor(Math.random() * pool.length)]
      if (!g) {
        dispatch({ type: 'error', error: 'Game unavailable. Choose players to try again.' })
        dispatch({ type: 'phase', phase: 'ATTRACT' })
        return
      }
      const players: Players = g.players === 2 ? 2 : 1
      current.current = {
        code: g.code,
        spec: g.spec ?? demoSpec(g.genre),
        slug: g.slug,
        title: g.title,
      }
      dispatch({
        type: 'game',
        game: { title: g.title, source: g.source, slug: g.slug, players },
        banner: `${why}. HERE'S ${g.title}`,
      })
      dispatch({ type: 'phase', phase: 'READY' })
      loadGame(g.code, g.title, players)
    },
    [loadGame],
  )

  const build = useCallback(
    async (transcript: string) => {
      listeningAttempt.current++
      talkHeld.current = false
      stt.current?.cancel()
      abort.current?.abort()
      const ac = new AbortController()
      abort.current = ac
      const players = view.current.mode
      dispatch({ type: 'resetBuild' })
      dispatch({ type: 'transcript', transcript })
      dispatch({ type: 'phase', phase: 'BUILDING' })
      let delivered = false
      let lastFailure = ''
      const fail = (message: string, status?: number) => {
        delivered = true
        // An error is terminal. Do not let a later library fallback replace it.
        ac.abort()
        listeningFrom.current = 'ATTRACT'
        dispatch({ type: 'error', error: classifyGenerationError(message, status).message })
        dispatch({ type: 'voice', stage: 'review' })
        dispatch({ type: 'phase', phase: 'LISTENING' })
      }
      // Show one coherent candidate, even when the second builder starts first.
      let previewVariant: number | null = null
      let streamStatus: Status = 'BUILDING'
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, players }),
          signal: ac.signal,
        })
        if (!res.ok) {
          fail(await res.text(), res.status)
          return
        }
        dispatch({ type: 'status', status: 'WAITING' })
        await readSse<PipelineEvent>(
          res,
          (ev) => {
            if (ac.signal.aborted) return
            switch (ev.type) {
              case 'spec':
                dispatch({ type: 'spec', spec: ev.spec })
                break
              case 'foundation':
                dispatch(ev)
                break
              case 'token':
                if (previewVariant === null) previewVariant = ev.variant
                if (ev.stage === 'repair' || ev.variant === previewVariant) {
                  dispatch({ type: 'token', text: ev.text })
                  dispatch({ type: 'status', status: streamStatus })
                }
                break
              case 'built':
                if (ev.variant === previewVariant) dispatch({ type: 'status', status: 'CHECKING' })
                break
              case 'probe':
                if (!ev.ok)
                  dispatch({ type: 'status', status: 'CHECKING', observations: ev.observations })
                break
              case 'repair':
                if (ev.phase === 'start') {
                  streamStatus = 'REPAIRING'
                  dispatch({ type: 'clearDraft' })
                }
                dispatch({
                  type: 'status',
                  status: ev.phase === 'start' ? 'REPAIRING' : 'CHECKING',
                  observations: ev.observations,
                })
                break
              case 'fallback':
                fail(lastFailure || ev.reason)
                break
              case 'ready': {
                delivered = true
                dispatch({ type: 'status', status: 'READY' })
                const fromLibrary = ev.source === 'library' || ev.source === 'template'
                if (fromLibrary || ev.source === 'kept') {
                  fail(lastFailure || 'No generated game passed validation')
                  return
                }
                const banner = ev.note || null
                const game: Game = {
                  title: ev.title,
                  source: ev.source,
                  slug: ev.slug,
                  players: ev.players,
                }
                current.current = ev.spec
                  ? { code: ev.code, spec: ev.spec, slug: ev.slug, title: ev.title }
                  : { code: ev.code, spec: demoSpec(''), slug: ev.slug, title: ev.title }
                dispatch({ type: 'game', game, banner })
                loadGame(ev.code, ev.title, ev.players)
                lastInput.current = Date.now()
                // Two players, but only one badge has said hello: offer 1P on the stick.
                const ready = view.current.session.filter((p) => p && !p.detached).length
                dispatch({ type: 'waiting2', waiting: ev.players === 2 && ready < 2 })
                dispatch({ type: 'phase', phase: 'READY' })
                break
              }
              case 'error':
                lastFailure = ev.message
                // A candidate may fail while another is still being generated.
                if (ev.terminal === false && classifyGenerationError(ev.message).retryable) break
                fail(ev.message)
                break
            }
          },
          ac.signal,
        )
        if (!delivered && !ac.signal.aborted)
          throw new Error(lastFailure || 'Incomplete generation')
      } catch (error) {
        if (ac.signal.aborted) return
        fail(error instanceof Error ? error.message : '')
      }
    },
    [loadGame],
  )

  // ---- listening ---------------------------------------------------------
  const openVoice = useCallback(() => {
    const p = view.current.phase
    if (p !== 'ATTRACT' && p !== 'LISTENING') return
    if (p !== 'LISTENING') {
      listeningFrom.current = p
    }
    abort.current?.abort()
    post({ type: 'pause', paused: true })
    dispatch({ type: 'transcript', transcript: '' })
    dispatch({ type: 'error', error: null })
    dispatch({ type: 'phase', phase: 'LISTENING' })
    dispatch({ type: 'voice', stage: 'ready' })
  }, [post])

  const startListening = useCallback(() => {
    if (view.current.phase !== 'LISTENING') return
    listeningAttempt.current++
    openVoice()
    dispatch({ type: 'voice', stage: 'connecting' })
    void getStt().start({
      onStream: (stream) => {
        setAudioStream(stream)
        if (stream) dispatch({ type: 'voice', stage: 'recording' })
      },
      onState: (state, detail) => {
        if (state === 'error') {
          talkHeld.current = false
          dispatch({ type: 'voice', stage: 'ready' })
          dispatch({ type: 'error', error: detail ?? 'Microphone unavailable. Try again.' })
        }
      },
    })
  }, [getStt, openVoice])

  const stopListening = useCallback(async () => {
    const attempt = listeningAttempt.current
    dispatch({ type: 'voice', stage: 'finishing' })
    let heard: string
    try {
      heard = await getStt().stop()
    } catch (error) {
      if (listeningAttempt.current !== attempt || view.current.phase !== 'LISTENING') return
      dispatch({ type: 'voice', stage: 'ready' })
      dispatch({
        type: 'error',
        error: error instanceof Error ? error.message : 'Transcription failed. Try again.',
      })
      return
    }
    if (listeningAttempt.current !== attempt || view.current.phase !== 'LISTENING') return
    const t = heard || view.current.transcript.trim()
    dispatch({ type: 'transcript', transcript: t })
    dispatch({ type: 'voice', stage: t ? 'review' : 'ready' })
    dispatch({
      type: 'error',
      error: t ? null : 'No transcript came through. Hold to talk and try again.',
    })
  }, [getStt])

  const cancelListening = useCallback(() => {
    listeningAttempt.current++
    talkHeld.current = false
    stt.current?.cancel()
    dispatch({ type: 'voice', stage: 'ready' })
    dispatch({ type: 'error', error: null })
    dispatch({ type: 'phase', phase: listeningFrom.current })
  }, [])

  const confirmMenu = useCallback(
    (index: number) => {
      if (index === 0 || index === 1) {
        const mode = index === 0 ? 1 : 2
        dispatch({ type: 'mode', mode })
        syncSession(view.current.badges, mode, 'ATTRACT')
        openVoice()
      } else if (index === 2 && view.current.game) {
        const mode = view.current.game.players
        dispatch({ type: 'mode', mode })
        syncSession(view.current.badges, mode, 'ATTRACT')
        dispatch({ type: 'phase', phase: view.current.rtState === 'playing' ? 'PLAYING' : 'READY' })
      } else {
        setSelection(0)
        dispatch({ type: 'phase', phase: 'OPTIONS' })
      }
    },
    [openVoice, syncSession],
  )

  const confirmOption = useCallback(
    (index: number) => {
      if (index === 0) setSound((on) => !on)
      else if (index === 1) fullscreen()
      else startAttract()
    },
    [fullscreen, startAttract],
  )

  // ---- input -------------------------------------------------------------
  const onInput = useCallback(
    (ev: InputEvent) => {
      lastInput.current = Date.now()
      const phase = view.current.phase
      if (ev.button === 'talk') {
        if (
          ev.down &&
          phase === 'LISTENING' &&
          view.current.voiceStage !== 'finishing' &&
          !talkHeld.current
        ) {
          talkHeld.current = true
          startListening()
        } else if (!ev.down && talkHeld.current) {
          talkHeld.current = false
          void stopListening()
        }
        return
      }
      if (phase === 'ATTRACT') {
        if (ev.down) {
          home.current?.input(ev.button)
          screen.current?.focus({ preventScroll: true })
        }
        return
      }
      if (phase === 'OPTIONS') {
        if (!ev.down) return
        const count = 3
        if (['up', 'left', 'down', 'right'].includes(ev.button)) {
          const direction = ev.button === 'up' || ev.button === 'left' ? -1 : 1
          setSelection((n) => (n + direction + count) % count)
          screen.current?.focus({ preventScroll: true })
        } else if (ev.button === 'start' || ev.button === 'a') {
          confirmOption(selectionRef.current)
        } else if (ev.button === 'b') {
          dispatch({ type: 'error', error: null })
          startAttract()
        }
        return
      }
      if (phase === 'LISTENING') {
        if (!ev.down) return
        if (ev.button === 'b') cancelListening()
        else if (
          (ev.button === 'start' || ev.button === 'a') &&
          view.current.voiceStage === 'review'
        )
          void build(view.current.transcript)
        else if (ev.button === 'left' || ev.button === 'right') {
          const count = textPages(view.current.transcript).length
          setPage((n) => (n + (ev.button === 'left' ? -1 : 1) + count) % count)
        }
        return
      }
      if (phase === 'BUILDING') {
        if (ev.down && ev.button === 'b') startAttract()
        return
      }
      if (phase === 'READY' || phase === 'GAMEOVER') {
        if (!ev.down) return
        if (ev.button === 'b') startAttract()
        else if (ev.button === 'start' || ev.button === 'a') {
          if (phase === 'GAMEOVER') dispatch({ type: 'phase', phase: 'READY' })
          else {
            post({ type: 'start' })
            dispatch({ type: 'phase', phase: 'PLAYING' })
            dispatch({ type: 'waiting2', waiting: false })
          }
        } else if (ev.button === 'left' || ev.button === 'right')
          setPage((n) => Math.max(0, n + (ev.button === 'left' ? -1 : 1)))
        return
      }
      if (phase === 'PLAYING') {
        if (ev.button === 'start' && ev.down) startAttract()
        else post({ type: 'input', player: ev.player, button: ev.button, down: ev.down })
      }
    },
    [post, startListening, stopListening, confirmOption, startAttract, cancelListening, build],
  )

  // Who plays is fixed by the mode, not decided per press (docs/design-guide.md,
  // Physical input): a one-player game is played on the cabinet controls and a
  // two-player game on the two badges. Every device may still work the shell
  // screens, and START pauses from anywhere. Off the cabinet (no ?cabinet=1)
  // the keyboard stands in for whichever device the mode needs, so a
  // two-player game can be developed on a laptop with arrows and I J K L.
  const onKeyboardInput = useCallback(
    (ev: InputEvent) => {
      if (view.current.phase === 'PLAYING' && ev.button !== 'start' && ev.button !== 'talk') {
        const mode = view.current.mode
        if (mode === 1 && ev.player !== 0) return
        if (mode === 2 && cabinetRef.current) return
      }
      onInput(ev)
    },
    [onInput],
  )
  useEffect(() => attachKeyboard(onKeyboardInput), [onKeyboardInput])

  // Badges: during play a badge drives its hub slot in a two-player game and
  // nothing at all in a one-player game, where it only names the score. On
  // every other screen a badge's d-pad, A, B and START work the shell.
  const onBadgeInput = useCallback(
    (ev: InputEvent) => {
      if (view.current.phase === 'PLAYING') {
        if (view.current.mode === 1 || ev.player > 1) return
        onInput(ev)
        return
      }
      onInput({ ...ev, player: 0 })
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
      if (e.repeat) return
      if (e.code === 'F3') {
        e.preventDefault()
        setShowPanel((on) => !on)
      }
      if (e.code === 'KeyF') fullscreen()
      if (e.code === 'KeyP' && view.current.phase === 'PLAYING') startAttract()
      if (
        e.code === 'KeyR' &&
        (view.current.phase === 'PLAYING' || view.current.phase === 'GAMEOVER')
      )
        dispatch({ type: 'phase', phase: 'READY' })
      if (e.code === 'Escape') {
        const p = view.current.phase
        if (p === 'LISTENING') cancelListening()
        else startAttract()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cancelListening, fullscreen, loadGame, post, startAttract])

  // ---- runtime messages --------------------------------------------------
  useEffect(() => {
    const h = (ev: MessageEvent) => {
      if (ev.source !== frame.current?.contentWindow) return
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
      } else if (m.type === 'error') {
        if (
          phase === 'PLAYING' ||
          phase === 'GAMEOVER' ||
          phase === 'FALLBACK' ||
          phase === 'READY'
        )
          crashFallback('THAT GAME CRASHED')
        else if (phase === 'ATTRACT') startAttract()
      }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [crashFallback, postScores, startAttract])

  // The microphone and local transcription request belong to this mounted cabinet.
  useEffect(() => {
    const s = getStt()
    const release = () => {
      if (view.current.phase === 'PLAYING') startAttract()
      if (talkHeld.current) {
        talkHeld.current = false
        void stopListening()
      }
    }
    const onVisibility = () => {
      if (document.hidden) release()
    }
    window.addEventListener('blur', release)
    window.addEventListener('pagehide', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', release)
      window.removeEventListener('pagehide', release)
      document.removeEventListener('visibilitychange', onVisibility)
      listeningAttempt.current++
      talkHeld.current = false
      s.cancel()
    }
  }, [getStt, stopListening, startAttract])

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
    post({ type: 'pause', paused: true })
    post({ type: 'mute', muted: true })
  }, [post])

  useEffect(() => {
    post({ type: 'pause', paused: v.phase !== 'PLAYING' })
    setPage(0)
    screen.current?.focus({ preventScroll: true })
  }, [v.phase, post])
  useEffect(() => {
    // Keep the last gameplay effect ringing while the results screen appears.
    // The runtime is paused there, so no new game sounds are scheduled.
    post({ type: 'mute', muted: !sound || !['PLAYING', 'GAMEOVER'].includes(v.phase) })
  }, [sound, v.phase, post])

  useEffect(() => {
    const t = setInterval(() => {
      const p = view.current.phase
      if ((p === 'PLAYING' || p === 'GAMEOVER') && Date.now() - lastInput.current > IDLE_MS)
        startAttract()
    }, 1000)
    return () => clearInterval(t)
  }, [startAttract])

  // ---- render ------------------------------------------------------------
  const talk = (down: boolean) => onInput({ player: 0, button: 'talk', down })
  const start = () => onInput({ player: 0, button: 'start', down: true })
  const spec = current.current?.spec
  const objective = typeof spec?.oneLiner === 'string' ? spec.oneLiner : 'PLAY FOR A HIGH SCORE'
  const controls = Object.entries((spec?.controls ?? {}) as Record<string, string | null>).filter(
    (row): row is [string, string] => typeof row[1] === 'string' && !!row[1],
  )
  const badgeDisplay = JSON.stringify({
    players: v.mode,
    playing: v.phase === 'PLAYING',
    controls: Object.fromEntries(controls),
  })
  useEffect(() => {
    void fetch('/api/badges/display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: badgeDisplay,
    }).catch(() => {})
  }, [badgeDisplay])
  const controlRows = controls.flatMap(([key, action]) =>
    textPages(action, 24).map((part, i) => [i === 0 ? key : '', part]),
  )
  const instructionPages: Array<{ objective: string; rows: string[][] }> = []
  if (objective.length > 60)
    for (const part of textPages(objective)) instructionPages.push({ objective: part, rows: [] })
  for (let i = 0; i < Math.max(1, controlRows.length); i += 3)
    instructionPages.push({
      objective: objective.length <= 60 && i === 0 ? objective : '',
      rows: controlRows.slice(i, i + 3),
    })
  const controlPages = instructionPages.length
  const readyPage = page % controlPages
  const instructions = instructionPages[readyPage]!
  const options = [`SOUND ${sound ? 'ON' : 'OFF'}`, 'FULLSCREEN', 'BACK']
  const readyBadges = v.session.filter((p) => p && !p.detached).length
  return (
    <main className="arcade-screen" ref={screen} tabIndex={-1} aria-label="Arcade">
      <iframe
        ref={frame}
        title="game"
        src={frameSrc}
        sandbox="allow-scripts"
        allow="autoplay"
        onLoad={onFrameLoad}
        className="game-frame"
        style={{ visibility: v.phase === 'PLAYING' ? 'visible' : 'hidden' }}
      />
      <header className="arcade-header" hidden={v.phase === 'ATTRACT'}>
        {[0, 1].slice(0, v.mode).map((i) => {
          const player = v.session[i]
          const name = player?.name.trim() || 'GUEST'
          return (
            <span className="player-name" key={i} title={`P${i + 1} ${name}`}>
              <span
                className="player-marker"
                aria-hidden="true"
                style={{ backgroundColor: player ? `rgb(${player.color.join(',')})` : '#aaa' }}
              />
              <span className="player-number">P{i + 1}</span>
              <span className="player-label">{name}</span>
            </span>
          )
        })}
      </header>
      {v.phase === 'ATTRACT' && (
        <HomeScreen
          ref={home}
          onPlay={playDemo}
          onCreate={(players) => confirmMenu(players - 1)}
          onOptions={() => {
            setSelection(0)
            dispatch({ type: 'phase', phase: 'OPTIONS' })
          }}
          onResume={v.game ? () => confirmMenu(2) : undefined}
          remembered={rememberedHome.current}
          onRemember={rememberHome}
          error={v.error}
        />
      )}
      {v.phase === 'OPTIONS' && (
        <section className="stage">
          <h1>OPTIONS</h1>
          <nav className="menu-list" aria-label="Options">
            {options.map((label, i) => (
              <button
                type="button"
                key={label}
                data-selected={selection === i}
                onClick={() => confirmOption(i)}
              >
                {selection === i ? '> ' : '  '}
                {label}
              </button>
            ))}
          </nav>
          {cabinet ? (
            <p className="support">
              PANEL: A B X Y<br />X START · Y TALK
            </p>
          ) : (
            <p className="support">
              KEYBOARD: ARROWS · Z / X<br />
              ENTER START · SPACE TALK
            </p>
          )}
          <p className="support">
            {v.badges.length} BADGES CONNECTED
            <br />
            VOICE: LOCAL · GAME: OPENAI
          </p>
        </section>
      )}
      {v.phase === 'LISTENING' && (
        <VoiceInput
          stage={v.voiceStage}
          stream={audioStream}
          transcript={v.transcript}
          error={v.error}
          onTalk={talk}
          onCreate={() => {
            if (view.current.transcript.trim()) void build(view.current.transcript.trim())
          }}
          onCancel={cancelListening}
          page={page}
          onPage={() => setPage((n) => n + 1)}
        />
      )}
      {v.phase === 'BUILDING' && (
        <BuildConsole
          code={v.code}
          foundation={v.foundation}
          title={v.spec?.title}
          status={v.status}
          players={v.spec?.players ?? v.mode}
          onCancel={startAttract}
        />
      )}
      {(v.phase === 'READY' || v.phase === 'FALLBACK') && (
        <section className="stage ready-stage">
          <h1 className="cyan">READY!</h1>
          <h2>{v.game?.title}</h2>
          {v.banner ? (
            <p role="status" className="notice">
              {v.banner}
            </p>
          ) : (
            <p className="objective">{instructions.objective}</p>
          )}
          <dl className="control-list">
            {instructions.rows.map(([key, action]) => (
              <div key={`${key}-${action}`}>
                <dt>{key === 'a' || key === 'b' ? `BUTTON ${key}` : key}</dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
          {controlPages > 1 && (
            <button type="button" className="support" onClick={() => setPage((n) => n + 1)}>
              MORE · {readyPage + 1}/{controlPages}
            </button>
          )}
          {v.game?.players === 2 && (
            <p className="support">
              {readyBadges < 2
                ? 'PLUG IN BOTH BADGES. THEY ARE THE CONTROLS'
                : 'THE BADGES ARE THE CONTROLS'}
            </p>
          )}
          {v.game?.players === 1 && v.session[0] && (
            <p className="support">PLAY ON THE CABINET CONTROLS. THE BADGE KEEPS THE SCORE</p>
          )}
          <button type="button" className="primary" onClick={start}>
            &gt; PLAY
          </button>
          <button type="button" className="back" onClick={startAttract}>
            MENU
          </button>
        </section>
      )}
      {v.phase === 'GAMEOVER' && (
        <section className="stage">
          <h2>{v.game?.title}</h2>
          <h1 className="result-title">{v.rtState === 'win' ? 'STAGE CLEAR' : 'GAME OVER'}</h1>
          <p className="score">
            {v.game?.players === 2 ? `P1 ${v.scores[0]} · P2 ${v.scores[1]}` : `SCORE ${v.score}`}
          </p>
          <button type="button" className="primary" onClick={start}>
            &gt; PLAY AGAIN
          </button>
          <button type="button" className="back" onClick={startAttract}>
            MENU
          </button>
        </section>
      )}
      {v.phase === 'PLAYING' && (
        <GameControls controls={controls} players={v.game?.players ?? 1} cabinet={cabinet} />
      )}
      {showPanel && <Panel />}
    </main>
  )
}

function demoSpec(genre: string): Record<string, unknown> {
  return {
    oneLiner:
      genre === 'shooter'
        ? 'SHOOT THE FLEET. DODGE THE BOMBS.'
        : genre === 'platformer'
          ? 'GRAB COINS. AVOID THE SLIMES.'
          : 'CATCH THE PIES. DODGE THE ANVILS.',
    controls: { left: 'MOVE LEFT', right: 'MOVE RIGHT', a: genre === 'shooter' ? 'SHOOT' : 'JUMP' },
  }
}
