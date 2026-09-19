import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, readRepoFile } from './env.ts'
import type { GameSpec, Genre } from './spec.ts'

export interface Template {
  genre: Genre | string
  title: string
  file: string
  code: string
  players: number
}

/** Templates ride in the prompt. Header lines `// TITLE:`, `// GENRE:` and `// PLAYERS:` name them. */
export function loadTemplates(): Template[] {
  const dir = resolve(ROOT, 'library/templates')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((file) => {
      const code = readRepoFile(`library/templates/${file}`)
      const title = code.match(/^\/\/\s*TITLE:\s*(.+)$/m)?.[1]?.trim() ?? file
      const genre = code.match(/^\/\/\s*GENRE:\s*(.+)$/m)?.[1]?.trim() ?? file.replace('.js', '')
      const players = Number(code.match(/^\/\/\s*PLAYERS:\s*(\d)/m)?.[1] ?? 1)
      return { genre, title, file, code, players }
    })
}

// Fixed exemplars so each system prefix is byte-identical across calls and
// the prompt cache hits. The chosen genre's template goes in the user turn.
const EXEMPLAR_GENRES = ['dodge', 'shooter']
const EXEMPLAR_GENRES_2P = ['versus', 'coop']

export const TWO_PLAYER_RULES = `TWO PLAYERS

This game is for exactly two players on one screen. api.players is 2.
- Read player one's input with api.btn(name, 0) / api.btnp(name, 0) and player two's with api.btn(name, 1) / api.btnp(name, 1). Never read a button without the index; never let one player's buttons move the other player.
- Keep the two players in one array and run the same movement code for both with a loop over 0 and 1, as in the example games.
- Draw player one in api.P1 and player two in api.P2, and start them on opposite sides so they are easy to tell apart.
- Versus: give a point with api.addScore(1, winnerIndex) and end with api.win(winnerIndex). Something must force the round to end: a closing arena, a timer, or a target score.
- Coop: score with api.addScore(n) (no index, both players get it), share the lives, and end with api.gameOver().
- Both players must be able to act from the first frame. Something must move on screen with no input at all.`

export const HOUSE_RULES = `HOUSE RULES

Output: exactly one fenced code block (\`\`\`js ... \`\`\`) containing the whole game. No prose before or after it.

Structure:
- Define init, update and draw as top-level function declarations, exactly as in the API reference.
- All state lives in top-level let/const variables and is rebuilt inside init(). Nothing runs outside those functions except constant definitions.
- 120 to 220 lines. Write the game, not an engine. One or two mechanics done well beat five done badly. Small helper functions are fine.
- Plain JavaScript only. No DOM, window, document, canvas, timers, promises, async, fetch, imports, classes, or libraries. Everything goes through api.
- Do not use api.btn('start'). START belongs to the runtime.

Feel:
- Something must be moving on screen from the first frame even with no input: enemies, scrolling, spawning, a bobbing player.
- Every control in the spec does something visible. A does something visible on the first press.
- The player can score within 5 seconds and can lose within 30 seconds if they stand still. Difficulty ramps with api.t (faster, denser, more), with no cap that makes it easy.
- Grace period: with no input at all, the game must still be alive after 3 seconds. Put the first hazard at least 3 seconds away, hover a falling player until the first press, or start slow. Never call api.gameOver() before api.t > 2.
- A must do something visible every time it is pressed during play (fire, jump, dash, boost, swing), not only in a waiting state. If A serves or launches, also give it an effect while the ball is in play.
- Call api.sfx on every event: pickup, hit, shoot, jump, bounce, death. Call api.flash(8, 3) and api.shake(10) when the player is hurt, api.flash(10, 1) on a pickup.

Look:
- Start draw with api.cls(c) using a non-black background colour that suits the theme, then a backdrop with some detail (ground, stars, water, walls, a border) and then the objects.
- Draw the player and the main enemies or pickups as sprites (string arrays, 6x6 to 12x12) defined as top-level constants. Use at least five colours across the screen.
- Keep the top 12 pixels clear for the runtime HUD. Do not draw a score, a title, lives text longer than a few characters, or "press start"; the runtime does that.
- Text is uppercase, 8 px per character, so keep any text under 30 characters.

Correctness:
- Prune objects that leave the screen. Arrays must not grow forever.
- Bound every loop. No while(true).
- Do not create sprites or arrays inside draw; define them once.
- Use api.rnd / api.rndi / Math.random for randomness. Use api.t and api.frame for time; never Date or performance.
- Read the API reference carefully. Only call functions that exist on api.`

export interface BuildPrompt {
  system: string
  user: string
  chosen: Template | null
  /** OpenAI prompt cache key; one per system prefix. */
  cacheKey: string
}

export function buildPrompt(
  spec: GameSpec,
  transcript: string,
  templates: Template[],
): BuildPrompt {
  const apiRef = readRepoFile('packages/runtime/API.md')
  const two = spec.players === 2
  const exemplars = (two ? EXEMPLAR_GENRES_2P : EXEMPLAR_GENRES)
    .map((g) => templates.find((t) => t.genre === g))
    .filter((t): t is Template => !!t)
  const chosen = templates.find((t) => t.genre === spec.genre) ?? null

  const system = [
    two
      ? 'You write complete, tiny 8-bit two-player arcade games in one shot for a fantasy console. You are given the console API, house rules, example games and a spec. You output one game file.'
      : 'You write complete, tiny 8-bit arcade games in one shot for a fantasy console. You are given the console API, house rules, example games and a spec. You output one game file.',
    '',
    '=== API REFERENCE ===',
    apiRef.trim(),
    '',
    '=== ' + 'HOUSE RULES' + ' ===',
    HOUSE_RULES.replace(/^HOUSE RULES\n\n/, ''),
    '',
    ...(two ? ['=== TWO PLAYERS ===', TWO_PLAYER_RULES.replace(/^TWO PLAYERS\n\n/, ''), ''] : []),
    ...exemplars.flatMap((t) => [
      `=== EXAMPLE GAME (${t.genre}): ${t.title} ===`,
      '```js',
      t.code.trim(),
      '```',
      '',
    ]),
  ].join('\n')

  const userParts = [
    '=== SPEC ===',
    JSON.stringify(spec, null, 2),
    '',
    '=== WHAT THE PERSON SAID ===',
    transcript.trim(),
    '',
  ]
  if (chosen) {
    userParts.push(
      `=== TEMPLATE TO ADAPT (${chosen.genre}): ${chosen.title} ===`,
      'Start from this game. Keep its structure and its proven loop, then change the theme, sprites, colours, mechanics and difficulty to match the spec. Rename everything to fit. It must feel like a different game.',
      '```js',
      chosen.code.trim(),
      '```',
      '',
    )
  } else {
    userParts.push(
      'No template exists for this genre. Follow the structure of the example games.',
      '',
    )
  }
  userParts.push(
    `Write the complete game.js for "${spec.title}" now. One fenced js block, nothing else.`,
  )
  return {
    system,
    user: userParts.join('\n'),
    chosen,
    cacheKey: two ? 'htn-build-2p-v1' : 'htn-build-v1',
  }
}

/** Pull the code out of the model's reply: first fenced block, else everything. */
export function extractCode(text: string): string {
  const fence = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/)
  const code = (fence ? fence[1] : text) ?? ''
  return `${code.trim()}\n`
}
