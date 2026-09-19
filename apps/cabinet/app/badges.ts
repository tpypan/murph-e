// Badge input for the kiosk page. The server's BadgeHub streams hello,
// button and bye events over /api/badges; this turns them into the same
// {player, button, down} events the keyboard produces (hard rule 6) and
// keeps a roster of who is plugged in for the screen.

import type { BadgeInfo, HubEvent } from '@htn/badge'
import type { Button, InputEvent } from './input'

export interface BadgePlayer {
  path: string
  badgeId: string
  name: string
  color: [number, number, number]
  /** The hub's controller index, in hello order. */
  slot: number
}

type BadgeEvent = HubEvent | { type: 'roster'; badges: BadgeInfo[] }

const GAME_BUTTONS = new Set<string>(['up', 'down', 'left', 'right', 'a', 'b', 'start'])

export function attachBadges(h: {
  /** Every button from a badge that has said hello, tagged with its hub slot. */
  onInput: (ev: InputEvent) => void
  /** The badges that have said hello, sorted by slot, after every change. */
  onRoster: (players: BadgePlayer[]) => void
  /** A badge that is plugged in but has not opened the app yet. */
  onWaiting?: (path: string) => void
}): () => void {
  const roster = new Map<string, BadgePlayer>()
  const publish = () => h.onRoster([...roster.values()].sort((a, b) => a.slot - b.slot))
  const es = new EventSource('/api/badges')
  es.onmessage = (m) => {
    let ev: BadgeEvent
    try {
      ev = JSON.parse(m.data) as BadgeEvent
    } catch {
      return
    }
    switch (ev.type) {
      case 'roster':
        roster.clear()
        for (const b of ev.badges) {
          if (b.identity && b.slot !== null)
            roster.set(b.path, { path: b.path, slot: b.slot, ...b.identity })
        }
        publish()
        break
      case 'hello':
        roster.set(ev.path, { path: ev.path, slot: ev.slot, ...ev.identity })
        publish()
        break
      case 'waiting':
      case 'installing':
        h.onWaiting?.(ev.path)
        break
      case 'bye':
      case 'detached':
        if (roster.delete(ev.path)) publish()
        break
      case 'button':
        if (GAME_BUTTONS.has(ev.button))
          h.onInput({ player: ev.slot, button: ev.button as Button, down: ev.down })
        break
      default:
        break
    }
  }
  return () => es.close()
}

export function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
