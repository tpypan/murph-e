import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { type CatalogContext, catalogContext } from './catalog.ts'
import { type DesignContext, designCore, selectDesignContext } from './design-context.ts'
import { ROOT, readRepoFile } from './env.ts'
import { type ReferenceContext, referenceContext } from './reference-context.ts'
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

export const TWO_PLAYER_RULES = `TWO PLAYERS

This game is for exactly two players on one screen. api.players is 2.
- Read player one's input with api.btn(name, 0) / api.btnp(name, 0) and player two's with api.btn(name, 1) / api.btnp(name, 1). Never read a button without the index; never let one player's buttons move the other player.
- Use independent input/state for each player. When delegating to a supplied foundation, its controller already handles this; do not wrap or reimplement it unnecessarily.
- Keep both players visually distinct with api.P1 / api.P2 accents or costume palettes that preserve character identity. Start them in appropriate positions for the game.
- Versus: preserve the game's documented score units, event values and reward ownership. For new mechanics, choose clear genre-appropriate rewards and award each event once. End with api.win(winnerIndex). Use a suitable timeout, finite objective or target score so play cannot stall forever. A supplied foundation already owns its scoring and terminal calls; do not add a second reward or win call around it.
- Coop: preserve the foundation's shared-versus-individual rewards and life rules. For new mechanics, api.addScore(n) with no index awards both players; pass a player index for an individual reward. Use shared or independent lives as the game requires. Call api.win() for team victory and api.gameOver() for team defeat only when your own game owns those transitions.
- Both players must be able to act from the first frame, including independent character selection when present. Never confirm for a human or start combat while one player is still choosing. Something must move on screen with no input at all.`

export const HOUSE_RULES = `HOUSE RULES

Output: exactly one fenced code block (\`\`\`js ... \`\`\`) containing the whole game. No prose before or after it.

Structure:
- Define init, update and draw as top-level function declarations, exactly as in the API reference.
- All state lives in top-level let/const variables and is rebuilt inside init(). Nothing runs outside those functions except constant definitions.
- There is no line-count target. Use enough code and art data to implement the requested mechanics, distinct animation poses, opponent behavior and a coherent stage. Reusable helpers and compact data are encouraged; never omit essential behavior or art just to shorten the file. Deliver a finished, playable game within the response budget.
- Plain JavaScript only. No DOM, window, document, canvas, timers, promises, async, fetch, imports, classes, or external libraries. Supplied ARCADE factories and ART.get sprite sets are available only when explicitly listed below; their source and pixels are bundled automatically. Everything renders and receives input through api.
- Do not use api.btn('start'). START belongs to the runtime.

Feel:
- The scene should feel alive from the first frame: intentional idle animation, stage motion, or opponent behavior appropriate to the genre. A bobbing static figure alone is not a substitute for action animation.
- Every declared control does something visible in its eligible state; null controls are unused. Controls work immediately after the runtime START. Fighters with multiple complete character sets should open with a responsive character picker: Left/Right chooses, A confirms, B unlocks. Use characterSelect:true when the supplied fighter foundation supports it. In 1P clearly show the CPU opponent; in 2P wait for both humans. Release confirmation inputs before combat so they cannot become attacks. Any round-intro countdown allows practice actions and only delays damage; never freeze input behind a redundant start screen.
- Give an achievable scoring opportunity within 5 seconds of active gameplay (after any player-controlled character selection). Action games develop real danger within about 30 seconds; honor calm or puzzle requests. Bound speed, density and minimum gaps. Introduce patterns and recovery phases with api.t instead of accelerating every parameter forever.
- Grace period: with no input at all, the game must still be alive after 3 seconds. Put the first hazard at least 3 seconds away, hover a falling player until the first press, or start slow. Never call api.gameOver() before api.t > 2.
- When A is declared, it has a meaningful action in its eligible state (fire, grounded jump, dash, boost, swing). Ensure the first press can demonstrate it. Do not add a midair jump just to make every press change the frame. If A serves or launches, give it a meaningful declared role during a rally too.
- Give important events distinct sound and visual feedback. Brief local hit sparks, recoil, hitstop and modest screen shake can make impact readable. Do not drown frequent actions in full-screen flashes or constant shaking.
- Every game needs gameplay sound: use the supplied api.sfx cues for its main action, impacts, rewards and failure; use short api.tone phrases for countdowns or transitions when appropriate. Trigger on event edges, never in draw or every frame of a held button/collision. Catalog foundations already provide these cues; preserve them without doubling sounds. A start/menu beep alone is not gameplay sound.

Look:
- Start draw with api.cls(c). Compose a coherent stage with foreground/midground/background where appropriate, grounded characters, deliberate palette shading and enough contrast to read hazards. Black is allowed when the scene calls for it. Use recognizable environmental shapes and detail, not just an empty flat field or repeated boxes.
- Follow the spec artDirection. Choose character scale for the composition: a close-up fighter may be 40–64 pixels tall, while a maze character can be small. These are examples, not size limits. Draw recognizable silhouettes, proportions, costume features, highlights and shadows with the default palette or exact per-sprite palettes via the optional sixth api.spr argument. For early streamed sprite previews, declare a complete NAME_PALETTE = ["#RRGGBB", ...] before the literal NAME pixel array.
- Use sprite arrays, layered pixel parts or carefully authored drawing helpers to create the art. Define reusable art data once. Include distinct idle, movement, attack and hurt poses where the game needs them; articulating limbs and changing silhouettes is better than sliding one unchanging sprite around. Use procedural drawing deliberately, not as placeholder rectangles.
- A named reference should influence proportions, poses, setting and signature mechanics, not just the title or colours. This call cannot fetch reference images; do not claim visual research.
- Keep the top 12 pixels clear for the runtime score HUD. Game-specific health bars, round timers and meters are allowed below it. The shell shows controls; avoid duplicate instruction paragraphs consuming the playfield. Do not draw the runtime score or a start screen.
- Text is uppercase, 8 px per character, so keep any text under 30 characters.

Correctness:
- Prune objects that leave the screen. Arrays must not grow forever.
- Bound every loop. No while(true).
- Do not create sprites or arrays inside draw; define them once.
- Use api.rnd / api.rndi / Math.random for randomness. Use api.t and api.frame for time; never Date or performance.
- Read the API reference carefully. Only call functions that exist on api.
- The explicit user request and referenceIntent.change take priority over contradictory reference defaults or incidental spec details. Preserve who chases whom, the primary objective and requested identities.
- When using a supplied tested foundation, its exact controls, score values, reward ownership, lives and terminal rules govern everything the player did not ask to change. The planner's spec is a draft interpretation; it cannot justify an invented bonus or a contradictory default. Preserve explicit requested changes, implementing new behavior when the documented hooks cannot express them.
- Before returning, check each promised mechanic against the code: a named place must be rendered and connected, a state must have entry/exit behavior, every advertised action must be reachable, and a completed match must call the runtime terminal API. Mentally trace start, main action, failure, victory and reset; do not claim a test was run.`

export interface BuildPrompt {
  system: string
  user: string
  /** Keep the original request available to bounded repair, not only the planner's interpretation. */
  transcript?: string
  chosen: Template | null
  /** OpenAI prompt cache key; one per system prefix. */
  cacheKey: string
  designContext: DesignContext
  referenceContext?: ReferenceContext
  catalog?: CatalogContext
}

export function buildPrompt(
  spec: GameSpec,
  transcript: string,
  templates: Template[],
): BuildPrompt {
  const apiRef = readRepoFile('packages/runtime/API.md')
  const designContext = selectDesignContext(transcript, spec)
  const references = referenceContext(transcript, spec)
  const catalog = catalogContext(transcript, spec)
  const two = spec.players === 2
  const chosen = templates.find((t) => t.genre === spec.genre && t.players === spec.players) ?? null

  const system = [
    two
      ? 'You write complete, polished 2D two-player arcade games in one shot for a fantasy console. You are given the console API, house rules and a spec. You output one game file.'
      : 'You write complete, polished 2D arcade games in one shot for a fantasy console. You are given the console API, house rules and a spec. You output one game file.',
    '',
    '=== API REFERENCE ===',
    apiRef.trim(),
    '',
    '=== ' + 'HOUSE RULES' + ' ===',
    HOUSE_RULES.replace(/^HOUSE RULES\n\n/, ''),
    '',
    designCore(),
    '',
    ...(two ? ['=== TWO PLAYERS ===', TWO_PLAYER_RULES.replace(/^TWO PLAYERS\n\n/, ''), ''] : []),
  ].join('\n')

  const userParts = [
    '=== SPEC ===',
    JSON.stringify(spec, null, 2),
    '',
    '=== WHAT THE PERSON SAID ===',
    transcript.trim(),
    '',
    designContext.text,
    '',
    references.text,
    '',
    catalog.text,
    '',
  ]
  if (chosen) {
    userParts.push(
      `=== OPTIONAL MATCHING EXAMPLE (${chosen.genre}): ${chosen.title} ===`,
      'This example demonstrates working API usage only. Borrow mechanics only if they match the request; its art, size, complexity and game loop are not quality ceilings. The user request and spec take precedence. Do not reskin it when the requested game needs a different structure.',
      '```js',
      chosen.code.trim(),
      '```',
      '',
    )
  } else {
    userParts.push(
      catalog.parts.length
        ? 'A tested foundation contract is supplied above. Delegate to its factory for the matching mechanics and implement the requested customization through its documented configuration/hooks.'
        : 'No complete matching game template is supplied. Use any relevant component references above and design the requested game directly against the API. There is no requirement to imitate another genre or reduce the requested mechanics.',
      '',
    )
  }
  userParts.push(
    `Write the complete game.js for "${spec.title}" now. One fenced js block, nothing else.`,
  )
  return {
    system,
    user: userParts.join('\n'),
    transcript: transcript.trim(),
    chosen,
    cacheKey: two ? 'htn-build-2p-v4.6' : 'htn-build-v4.6',
    designContext,
    referenceContext: references,
    catalog,
  }
}

/** Pull the code out of the model's reply: first fenced block, else everything. */
export function extractCode(text: string): string {
  const fence = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/)
  const code = (fence ? fence[1] : text) ?? ''
  return `${code.trim()}\n`
}
