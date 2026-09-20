'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Button } from './input'

export interface DemoSummary {
  id: string
  revision?: string
  title: string
  description: string
  genre: string
  players: Array<1 | 2>
}

const demoKey = (game: DemoSummary, players: 1 | 2) =>
  `${game.id}:${game.revision ?? 'legacy'}:${players}`
export interface DemoGame extends DemoSummary {
  code: string
  spec: Record<string, unknown>
}
export interface HomeHandle {
  input: (button: Button) => void
}

function GameplayPreview({
  game,
  players,
  animate = true,
}: {
  game: DemoGame
  players: 1 | 2
  animate?: boolean
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const target = frame.current?.contentWindow
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let ready = false
    let sent = false
    const send = () => {
      target?.postMessage({ type: 'preview-heartbeat' }, '*')
      if (!ready) target?.postMessage({ type: 'preview-ping' }, '*')
      else if (!sent) {
        sent = true
        target?.postMessage(
          {
            type: 'preview-code',
            mode: 'demo',
            code: game.code,
            genre: game.genre,
            players,
            motion: animate && !reduced.matches,
          },
          '*',
        )
      }
    }
    const receive = (event: MessageEvent) => {
      if (event.source !== target) return
      if (event.data?.type === 'preview-ready') {
        ready = true
        send()
      }
      if (event.data?.type === 'preview-frame') setVisible(true)
      if (event.data?.type === 'preview-unavailable') setFailed(true)
    }
    const motion = () => {
      sent = false
      send()
    }
    window.addEventListener('message', receive)
    reduced.addEventListener('change', motion)
    const timer = setInterval(send, 600)
    send()
    return () => {
      target?.postMessage({ type: 'preview-stop' }, '*')
      clearInterval(timer)
      window.removeEventListener('message', receive)
      reduced.removeEventListener('change', motion)
    }
  }, [game, players, animate])
  return (
    <div
      className="home-preview"
      data-game-id={game.id}
      data-players={players}
      data-ready={visible}
    >
      <iframe
        ref={frame}
        src="/runtime/build-preview.html"
        sandbox="allow-scripts"
        title={`${game.title} gameplay preview`}
        tabIndex={-1}
        aria-hidden="true"
      />
      {!visible && animate && (
        <p className="support">{failed ? 'PREVIEW UNAVAILABLE' : 'LOADING GAME'}</p>
      )}
    </div>
  )
}

export const HomeScreen = forwardRef<
  HomeHandle,
  {
    onPlay: (game: DemoGame, players: 1 | 2) => void
    /** MAKE A GAME creates one game supporting both player modes. */
    onCreate: () => void
    onOptions: () => void
    onResume?: () => void
    remembered: { id?: string; players: 1 | 2 }
    onRemember: (id: string, players: 1 | 2) => void
    /** Badges that have said hello; two of them make the demos default to 2P. */
    badgesReady?: number
    /** What the controls do here, in the words of the device that plays. */
    hint?: string
    error: string | null
  }
>(function HomeScreen(
  { onPlay, onCreate, onOptions, onResume, remembered, onRemember, badgesReady = 0, hint, error },
  ref,
) {
  const [games, setGames] = useState<DemoSummary[]>([])
  const [index, setIndex] = useState(0)
  const [players, setPlayers] = useState<1 | 2>(badgesReady >= 2 ? 2 : remembered.players)
  // The row follows the badges (two in: 2P) and can still be overridden for a demo.
  useEffect(() => {
    setPlayers(badgesReady >= 2 ? 2 : 1)
  }, [badgesReady])
  const cache = useRef(new Map<string, DemoGame>())
  const [loaded, setLoaded] = useState(new Map<string, DemoGame>())
  // The stick walks a grid: row 0 the game carousel (left/right browses),
  // row 1 the player count (left/right toggles), row 2 PLAY | MAKE A GAME and
  // row 3 RESUME GAME | OPTIONS (left/right picks the column). Opens on PLAY.
  const [cursor, setCursor] = useState<{ row: number; col: number }>({ row: 2, col: 0 })
  const selection = cursor.row
  const at = (row: number, col = 0) => cursor.row === row && cursor.col === col
  const focus =
    (row: number, col = 0) =>
    () =>
      setCursor({ row, col })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const selectedId = useRef(remembered.id)
  const selected = games[index]
  if (selected) selectedId.current = selected.id
  const previous = games.length > 1 ? games[(index - 1 + games.length) % games.length] : undefined
  const next = games.length > 1 ? games[(index + 1) % games.length] : undefined
  const modeFor = (summary: DemoSummary) =>
    summary.players.includes(players) ? players : summary.players[0]!
  const loadedGame = selected ? loaded.get(demoKey(selected, players)) : undefined
  const previousGame = previous ? loaded.get(demoKey(previous, modeFor(previous))) : undefined
  const nextGame = next ? loaded.get(demoKey(next, modeFor(next))) : undefined
  useEffect(() => {
    const controller = new AbortController()
    let pending = false,
      signature = '',
      received = false
    const refresh = async () => {
      if (pending || document.hidden || controller.signal.aborted) return
      pending = true
      try {
        const response = await fetch('/api/demos', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Catalog unavailable')
        const data: { games: DemoSummary[] } = await response.json()
        if (controller.signal.aborted) return
        const nextSignature = JSON.stringify(data.games)
        if (signature !== nextSignature) {
          signature = nextSignature
          const nextIndex = data.games.findIndex((g) => g.id === selectedId.current)
          setGames(data.games)
          setIndex(Math.max(0, nextIndex))
        }
        received = true
        setLoadingList(false)
        setLoadError((current) => (current === 'GAMES UNAVAILABLE' ? null : current))
      } catch {
        if (!controller.signal.aborted && !received) {
          setLoadingList(false)
          setLoadError('GAMES UNAVAILABLE')
        }
      } finally {
        pending = false
      }
    }
    void refresh()
    const timer = setInterval(refresh, 5000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  useEffect(() => {
    if (!selected) return
    if (!selected.players.includes(players)) {
      setPlayers(selected.players[0]!)
      return
    }
    const controller = new AbortController()
    setLoadError(null)
    onRemember(selected.id, players)
    // Only fetch the selected game and its neighbours; keep a small local cache.
    const requested = new Set<string>()
    for (const summary of [selected, previous, next]) {
      if (!summary) continue
      const mode = summary.players.includes(players) ? players : summary.players[0]!
      const key = demoKey(summary, mode)
      if (requested.has(key)) continue
      requested.add(key)
      const cached = cache.current.get(key)
      if (cached) {
        cache.current.delete(key)
        cache.current.set(key, cached)
        continue
      }
      fetch(`/api/demos/${encodeURIComponent(summary.id)}?players=${mode}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error()
          return response.json()
        })
        .then((data: DemoGame) => {
          if (controller.signal.aborted) return
          if (data.revision !== summary.revision) throw new Error('Demo changed while loading')
          cache.current.set(key, data)
          while (cache.current.size > 6) cache.current.delete(cache.current.keys().next().value!)
          setLoaded(new Map(cache.current))
        })
        .catch(() => {
          if (!controller.signal.aborted && summary.id === selected.id)
            setLoadError('GAME UNAVAILABLE. CHOOSE ANOTHER.')
        })
    }
    return () => controller.abort()
  }, [selected, previous, next, players, onRemember])
  const browse = useCallback(
    (delta: number) => {
      if (games.length) setIndex((n) => (n + delta + games.length) % games.length)
    },
    [games.length],
  )
  const play = () => {
    if (loadedGame) onPlay(loadedGame, players)
  }
  const ROWS = 4
  const columns = (row: number) => (row === 2 ? 2 : row === 3 && onResume ? 2 : 1)
  useImperativeHandle(ref, () => ({
    input(button) {
      const { row, col } = cursor
      if (button === 'left' || button === 'right') {
        const step = button === 'left' ? -1 : 1
        if (row === 0) browse(step)
        else if (row === 1) {
          if (selected?.players.length === 2) setPlayers((p) => (p === 1 ? 2 : 1))
        } else {
          const n = columns(row)
          setCursor({ row, col: (col + step + n) % n })
        }
      } else if (button === 'up' || button === 'down') {
        const next = (row + (button === 'up' ? -1 : 1) + ROWS) % ROWS
        setCursor({ row: next, col: Math.min(col, columns(next) - 1) })
      } else if (button === 'a' || button === 'start') {
        if (row <= 1) play()
        else if (row === 2) {
          if (col === 0) play()
          else onCreate()
        } else if (onResume && col === 0) onResume()
        else onOptions()
      }
    },
  }))
  return (
    <section className="home-stage" aria-label="Choose a game">
      <div
        className="home-showcase"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          swipe.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={(event) => {
          const from = swipe.current
          swipe.current = null
          if (
            from &&
            Math.abs(event.clientX - from.x) > 30 &&
            Math.abs(event.clientX - from.x) > Math.abs(event.clientY - from.y)
          )
            browse(event.clientX < from.x ? 1 : -1)
        }}
        onPointerCancel={() => {
          swipe.current = null
        }}
      >
        <button
          type="button"
          className="home-peek is-previous"
          aria-label="Previous game"
          onFocus={focus(0)}
          onClick={() => browse(-1)}
          disabled={games.length < 2}
        >
          {previousGame && (
            <span className="home-peek-scene" aria-hidden="true">
              <GameplayPreview
                key={demoKey(previousGame, modeFor(previous!))}
                game={previousGame}
                players={modeFor(previous!)}
                animate={false}
              />
            </span>
          )}
        </button>
        <div className="home-current">
          {loadedGame ? (
            <GameplayPreview
              key={demoKey(loadedGame, players)}
              game={loadedGame}
              players={players}
            />
          ) : (
            <div className="home-preview">
              <p className="support">
                {loadError ?? (loadingList || selected ? 'LOADING GAMES' : 'MAKE THE FIRST GAME')}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="home-peek is-next"
          aria-label="Next game"
          onFocus={focus(0)}
          onClick={() => browse(1)}
          disabled={games.length < 2}
        >
          {nextGame && (
            <span className="home-peek-scene" aria-hidden="true">
              <GameplayPreview
                key={demoKey(nextGame, modeFor(next!))}
                game={nextGame}
                players={modeFor(next!)}
                animate={false}
              />
            </span>
          )}
        </button>
      </div>
      <div className="home-caption" aria-live="polite">
        <h2 data-selected={selection === 0}>{selected?.title ?? 'YOUR NEXT HIGH SCORE'}</h2>
      </div>
      <fieldset className="home-players" aria-label="Players">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={n === 1 ? '1 PLAYER' : '2 PLAYERS'}
            aria-pressed={players === n}
            disabled={!!selected && !selected.players.includes(n)}
            data-selected={selection === 1 && players === n}
            onFocus={focus(1)}
            onClick={() => setPlayers(n)}
          >
            {players === n ? '■ ' : ''}
            {n === 1 ? '1 PLAYER' : '2 PLAYERS'}
          </button>
        ))}
      </fieldset>
      <p className="support home-badges">
        {badgesReady >= 2 ? '2 BADGES IN: PLAYING AS 2' : 'PLUG IN 2 BADGES TO PLAY TOGETHER'}
      </p>
      <div className="home-actions">
        <button
          type="button"
          className="primary"
          disabled={!loadedGame}
          data-selected={at(2, 0)}
          onFocus={focus(2, 0)}
          onClick={play}
        >
          {at(2, 0) ? '> ' : ''}PLAY
        </button>
        <button type="button" data-selected={at(2, 1)} onFocus={focus(2, 1)} onClick={onCreate}>
          MAKE A GAME
        </button>
      </div>
      {(loadError || error) && (
        <p className="home-error" role="alert">
          {loadError ?? error}
        </p>
      )}
      <div className="home-footer">
        {onResume && (
          <button type="button" data-selected={at(3, 0)} onFocus={focus(3, 0)} onClick={onResume}>
            RESUME GAME
          </button>
        )}
        <button
          type="button"
          data-selected={at(3, onResume ? 1 : 0)}
          onFocus={focus(3, onResume ? 1 : 0)}
          onClick={onOptions}
        >
          OPTIONS
        </button>
      </div>
      {hint && (
        <p className="support controls-strip home-hint" role="note" aria-label="Controls">
          {hint}
        </p>
      )}
    </section>
  )
})
