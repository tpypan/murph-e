import { z } from 'zod'
import { catalogContext } from './catalog.ts'
import { REQUEST_LIMITS, withDeadline } from './deadline.ts'
import {
  DESIGN_CARD_IDS,
  type DesignContext,
  designCatalogue,
  designCore,
  selectDesignContext,
} from './design-context.ts'
import { MODELS, ms, now, openai } from './env.ts'
import {
  MULTIPLAYER_DESIGN_RULES,
  MultiplayerPlanSchema,
  multiplayerJsonSchema,
} from './multiplayer.ts'
import { referenceContext } from './reference-context.ts'

export const GENRES = [
  'dodge',
  'shooter',
  'platformer',
  'snake',
  'breakout',
  'runner',
  'pong',
  'flappy',
  'fighting',
  'brawler',
  'racing',
  'rhythm',
  'puzzle',
  'maze',
  'sports',
  'adventure',
] as const
// Suggestions, not an exhaustive enum. Mechanics and player count are independent.
// Retain legacy versus/coop labels so saved games can still be remixed.
export const GENRES_2P = [...GENRES, 'versus', 'coop'] as const
export const ALL_GENRES = GENRES_2P
export type Genre = string
export type Players = 1 | 2

const controlDescription = z
  .string()
  .nullable()
  .transform((value) =>
    value === null || /^(?:unused|none|not used|no action|n\/a)?$/i.test(value.trim())
      ? null
      : value.trim(),
  )

export const GameSpecSchema = z.object({
  multiplayer: MultiplayerPlanSchema.optional(),
  title: z.string().min(1),
  oneLiner: z.string().min(1),
  genre: z.string().trim().min(1).max(64),
  // Main's design fields remain optional for existing saved games and callers.
  hook: z.string().optional(),
  ramp: z.string().optional(),
  mechanics: z.array(z.string()).min(1).max(12),
  // Optional when reading existing saved games; required from new specifications.
  artDirection: z.string().max(1200).optional(),
  // Make adaptations explicit instead of burying changed verbs in a summary.
  referenceIntent: z
    .object({
      reference: z.string(),
      preserve: z.array(z.string()).max(6),
      change: z.array(z.string()).max(6),
    })
    .optional(),
  controls: z.object({
    left: controlDescription,
    right: controlDescription,
    up: controlDescription,
    down: controlDescription,
    a: controlDescription,
    b: controlDescription,
  }),
  palette: z.enum(['arcade', 'gameboy', 'nes', 'cga']),
  lose: z.string(),
  scoring: z.string(),
  moderated: z.boolean(),
  note: z.string(),
  remix: z.boolean(),
  changes: z.array(z.string()),
  // Optional for library games saved before design context was connected.
  designCards: z.array(z.enum(DESIGN_CARD_IDS)).max(4).optional(),
})
export const GeneratedGameSpecSchema = GameSpecSchema.extend({ multiplayer: MultiplayerPlanSchema })
export type GameSpec = z.infer<typeof GameSpecSchema> & { players: Players }

// Hand-written so it is strict-mode valid: every property required, no extras.
export const specJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'multiplayer',
    'title',
    'oneLiner',
    'genre',
    'hook',
    'ramp',
    'mechanics',
    'artDirection',
    'referenceIntent',
    'controls',
    'palette',
    'lose',
    'scoring',
    'moderated',
    'note',
    'remix',
    'changes',
    'designCards',
  ],
  properties: {
    multiplayer: multiplayerJsonSchema,
    referenceIntent: {
      type: 'object',
      additionalProperties: false,
      required: ['reference', 'preserve', 'change'],
      description:
        'Resolve the named-game adaptation BEFORE detailing mechanics. The requested changes take precedence over the reference defaults. Empty strings/lists when no reference game is named.',
      properties: {
        reference: {
          type: 'string',
          description:
            'The game or tradition referenced by the user, not an invented source lookup.',
        },
        preserve: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 6,
          description:
            'Concrete signature structures and behavior that should remain recognizable.',
        },
        change: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 6,
          description:
            'Explicit requested changes, including who acts on whom and how the objective changes. Do not add limitations the user did not request.',
        },
      },
    },
    designCards: {
      type: 'array',
      items: { type: 'string', enum: DESIGN_CARD_IDS },
      maxItems: 4,
      description:
        'Up to four relevant local design card IDs, chosen for the actual mechanics and character requirements.',
    },
    title: { type: 'string', description: 'Uppercase, at most 14 characters, shown on screen.' },
    oneLiner: { type: 'string', description: 'One sentence a player would read on a cabinet.' },
    genre: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      description:
        'Accurate lowercase genre or hybrid, e.g. fighting, brawler, racing, puzzle, rhythm. Invent a precise label when needed; never force a request into the available templates. Preserve the current label for a remix.',
    },
    hook: {
      type: 'string',
      maxLength: 160,
      description:
        'The central interesting decision and its tradeoff, grounded in the requested mechanics or supplied foundation. Do not invent an extra score system. Empty when remix is true.',
    },
    ramp: {
      type: 'string',
      maxLength: 200,
      description:
        'Bounded progression and pressure/recovery appropriate to this game, preserving the supplied foundation defaults unless explicitly changed. Describe new patterns where relevant, not endless speed growth or a mandatory one-minute schedule. Empty when remix is true.',
    },
    artDirection: {
      type: 'string',
      maxLength: 1200,
      description:
        'Concrete visual plan: character size in pixels, identifying features, distinct action poses, background layers, contrast and composition. Fit the actual 256x224 screen, default 16-color palette and optional exact per-sprite palettes.',
    },
    mechanics: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 12,
      description:
        'Enough concrete rules to define the requested game: movement, action states and timing, interactions, opponent behavior, win/loss, progression and feedback. Usually 5 to 10 lines.',
    },
    controls: {
      type: 'object',
      additionalProperties: false,
      required: ['left', 'right', 'up', 'down', 'a', 'b'],
      properties: {
        left: { type: ['string', 'null'] },
        right: { type: ['string', 'null'] },
        up: { type: ['string', 'null'] },
        down: { type: ['string', 'null'] },
        a: { type: ['string', 'null'] },
        b: { type: ['string', 'null'] },
      },
    },
    palette: { type: 'string', enum: ['arcade', 'gameboy', 'nes', 'cga'] },
    lose: { type: 'string', description: 'How the player loses, in one line.' },
    scoring: { type: 'string', description: 'What scores points, in one line.' },
    moderated: {
      type: 'boolean',
      description: 'True if the request was unsafe or not a game and was replaced.',
    },
    note: {
      type: 'string',
      description:
        'Empty, or one short uppercase line shown on screen when the request was changed, e.g. MADE IT ONE PLAYER.',
    },
    remix: {
      type: 'boolean',
      description:
        'True only when a game is already on screen and the person is asking to change that game rather than for a new one.',
    },
    changes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'When remix is true: 1 to 4 short imperative lines a programmer can apply to the existing code. Otherwise empty.',
    },
  },
}

export const SPEC_INSTRUCTIONS = `You turn what a person said into a spec for a complete, polished 2D arcade game that a second model will write in one go. The game runs at 256x224 with a default 16-colour palette plus optional exact per-sprite palettes, a d-pad and two buttons (A, B) per human. The current session has one human; the same generated game must also support two humans.

Rules:
- Keep the person's idea. Their nouns become the sprites and the theme. Their verbs become the mechanics.
- Describe the actual genre, using any precise lowercase label or hybrid. Fighting, brawler, racing, rhythm, puzzle, maze, sports and adventure are valid; these are examples, not a closed list. Genre is metadata, not a restriction or an instruction to reskin a template. Street Fighter is fighting, not dodge.
- Preserve the requested experience and signature mechanics. One viewport does not mean one static room: scrolling stages, rounds, progression and compact multi-stage games are allowed. Adapt only what is incompatible with the actual 2D runtime, physical controls, player count or generation budget, and explain material changes in note.
- The current session has one human. Preserve requested multiplayer rules in the two-player mode and describe the solo adaptation in multiplayer.solo. Requests beyond two local humans must explain the two-human limit in note; do not remove multiplayer support.
- If the request is vague ("something with cats", "a relaxing game"), invent a concrete, charming game that fits.
- Give an achievable scoring opportunity within 5 seconds. Action games should develop real danger within about 30 seconds; preserve calm or puzzle requests. Use bounded difficulty and pressure/recovery phases, not endless acceleration. Describe one concrete skillful action, reward, and hazard interaction.
- hook: the central decision and what it risks. Name an actual gameplay tradeoff, such as choosing a route, spacing an attack, managing a scarce resource or coordinating with a teammate. Preserve the supplied foundation's tested reward rules; do not invent combo points or extra meters to create a hook.
- ramp: describe genre-appropriate progression, new patterns and pressure/recovery with fair limits. Use the supplied foundation's stage, round or race structure unless the person asks to change it. No mandatory three-stage first minute, no endless acceleration, and no forced loss for calm or puzzle requests.
- title: at most 14 characters, uppercase, punchy. oneLiner: one sentence. mechanics: usually 5 to 10 concrete rules, up to 12 when necessary. Include essential state transitions and feedback, not just a theme.
- controls: declare only inputs that serve the actual game. Use null for unused inputs, never the string "Unused". Rhythm and puzzle games need not use movement; movement-only games need not invent an A action. Describe each used control and its eligible states.
- The cabinet already handles START. Controls must work as soon as play begins; use a harmless opponent/grace period rather than locking input for an intro countdown.
- artDirection: plan the composition, character scale, distinguishing features, palette shading and animation poses. For close-up fighting, fighters roughly 40–64 pixels tall can occupy the stage meaningfully; adapt scale to the genre. Specify readable idle, movement, attack and hurt poses where relevant. Small resolution does not mean tiny figures or crude art.
- For fighting: define spacing, facing, jump/crouch where appropriate, attacks with startup/active/recovery, blocking, hitstun and knockback. Each attack hits once; opponents telegraph and leave punishable recovery. An abbreviated two-button moveset should still feel like fighting.
- palette is a colour mood hint; primitives use the default 16 colours and each sprite draw can supply up to 16 exact RGB colours. Multiple draws or aligned planes may use different palettes; retain the full colours of supplied ART sets through their draw helper. This is not a global scene colour limit.
- Moderation: if the request is hateful, sexual, about real people, about self-harm, about real-world violence such as shootings or attacks on people or places, or is not a game at all, do not make that game. Replace it with an unrelated, wholesome arcade game, set moderated to true, and set note to LET'S PLAY THIS INSTEAD. Cartoon action such as shooting asteroids, zapping aliens or bonking slimes is fine.
- Remix: when the input says a game is already on screen and the person is asking to change that game, set remix to true, keep the title and the genre, and put the concrete changes in changes (1 to 4 short imperative lines, e.g. "double the car speed ramp", "add a boss sprite at the top that fires every 2 seconds"). The rest of the spec then describes the game after the changes. A remix is a modification: speed, size, count, lives, difficulty, colours, one new enemy or item, or swapping one thing ("make the hero a cat"). Words that describe a game with its own premise (a different hero, setting and goal, e.g. "a game where a penguin slides on ice collecting fish") are a NEW game even if the genre is similar: remix false, changes empty, and the spec describes that new game. With no game on screen, remix is always false. When remix is true, leave hook and ramp as empty strings and describe the requested behavior in changes.`

export const SPEC_INSTRUCTIONS_2P = `You turn what two people said into a spec for a complete, polished 2D arcade game supporting both solo and two-player play, currently starting with two humans, that a second model will write in one go. The game runs at 256x224 with a default 16-colour palette plus optional exact per-sprite palettes. Each player has their own d-pad and two buttons (A, B). Both players share one cabinet display. Use a shared arena when appropriate; a racer may use two compact independent viewports within that display.

Rules:
- Keep their idea. Their nouns become the sprites and the theme. Their verbs become the mechanics.
- Describe the actual genre with any precise lowercase label or hybrid: fighting, racing, puzzle, shooter, rhythm, sports, etc. Genre is independent of player count. In mechanics explicitly state whether players compete or cooperate, their roles, and how they win. Preserve legacy versus/coop labels when remixing a saved game.
- Preserve signature mechanics. Scrolling stages, rounds, progression and compact multi-stage games are allowed within one shared viewport. Adapt only what is incompatible with the actual runtime or controls; explain material changes in note.
- The current session has two humans. Also design the solo mode in multiplayer.solo. Requests beyond two local humans must explain the two-human limit in note.
- If the request is vague ("something fun for us"), invent a concrete, charming two-player game that fits.
- Versus: use a finite objective, suitable timer or bounded progress so play cannot stall forever. Preserve a supplied foundation's documented round timing and terminal rules unless the person asked to change them; do not replace its defaults with a universal one-minute round. Coop: give an achievable scoring opportunity within 5 seconds and real danger within about 30 seconds for action games. Preserve calm requests. Use bounded difficulty and pressure/recovery phases. Preserve signature mechanics even when the genre label is broad.
- hook: the central decision and what it risks. Name an actual gameplay tradeoff, such as choosing a route, spacing an attack, managing a scarce resource or coordinating with a teammate. Preserve the supplied foundation's tested reward rules; do not invent combo points or extra meters to create a hook.
- ramp: describe genre-appropriate progression, new patterns and pressure/recovery with fair limits. Use the supplied foundation's stage, round or race structure unless the person asks to change it. No mandatory three-stage first minute, no endless acceleration, and no forced loss for calm or puzzle requests.
- title: at most 14 characters, uppercase, punchy. oneLiner: one sentence that mentions both players. mechanics: usually 5 to 10 concrete rules, up to 12 when necessary; explicitly describe both player roles.
- controls: describe each used input for either player (the same mapping for both); use null for unused inputs, never the string "Unused". Do not invent extra actions merely to fill buttons.
- The cabinet already handles START. Both players can act immediately; any round-intro countdown allows practice movement/actions and only delays damage, rather than locking controls.
- artDirection: plan the composition, character scale, distinguishing features, palette shading and animation poses. For close-up fighting, fighters roughly 40–64 pixels tall can occupy the stage meaningfully; adapt scale to the genre. Specify readable idle, movement, attack and hurt poses where relevant. Small resolution does not mean tiny figures or crude art.
- For fighting: define spacing, facing, jump/crouch where appropriate, attacks with startup/active/recovery, blocking, hitstun and knockback. Each attack hits once; opponents telegraph and leave punishable recovery. An abbreviated two-button moveset should still feel like fighting.
- palette is a colour mood hint; primitives use the default 16 colours and each sprite draw can supply up to 16 exact RGB colours. Multiple draws or aligned planes may use different palettes; retain the full colours of supplied ART sets through their draw helper. This is not a global scene colour limit.
- Moderation: if the request is hateful, sexual, about real people, about self-harm, about real-world violence such as shootings or attacks on people or places, or is not a game at all, do not make that game. Replace it with an unrelated, wholesome two-player arcade game, set moderated to true, and set note to LET'S PLAY THIS INSTEAD. Cartoon action such as shooting asteroids, zapping aliens, sword duels or bonking slimes is fine.
- Remix: when the input says a game is already on screen and the players are asking to change that game, set remix to true, keep the title and the genre, and put the concrete changes in changes (1 to 4 short imperative lines). The rest of the spec then describes the game after the changes. A remix is a modification: speed, size, count, lives, difficulty, colours, one new enemy or item, or swapping one thing. Words that describe a game with its own premise (a different hero, setting and goal) are a NEW game even if the genre is similar: remix false, changes empty, and the spec describes that new game. With no game on screen, remix is always false. When remix is true, leave hook and ramp as empty strings and describe the requested behavior in changes.`

export interface SpecResult {
  spec: GameSpec
  context: DesignContext
  prompt: { system: string; user: string }
  ms: number
  usage: { input: number; output: number; cached: number }
}

export interface SpecOptions {
  signal?: AbortSignal
  model?: string
  effort?: string
  /** Set by the cabinet's 1P/2P menu, never inferred from the transcript. */
  players?: Players
  /** The spec of the game on screen, if any; enables remix. */
  current?: GameSpec | null
}

function describeCurrent(spec: GameSpec): string {
  const {
    title,
    genre,
    oneLiner,
    hook,
    ramp,
    mechanics,
    artDirection,
    controls,
    lose,
    scoring,
    multiplayer,
  } = spec
  return JSON.stringify({
    title,
    genre,
    oneLiner,
    hook,
    ramp,
    mechanics,
    artDirection,
    controls,
    lose,
    scoring,
    multiplayer,
  })
}

export function specPrompt(transcript: string, opts: SpecOptions = {}) {
  const players = opts.players === 2 ? 2 : 1
  const context = selectDesignContext(transcript, opts.current ?? {}, 'spec')
  const system = [
    players === 2 ? SPEC_INSTRUCTIONS_2P : SPEC_INSTRUCTIONS,
    MULTIPLAYER_DESIGN_RULES,
    'Fill referenceIntent first. Example: Pac-Man but a goose chases the ghosts changes the player into the hunter; ghosts flee by default and catching ghosts must advance the primary objective. Do not restrict that requested reversal to a temporary power-up unless the user asks for that. Mechanics, scoring and lose conditions must agree with referenceIntent.change. Reference behavior is subordinate to the explicit adaptation.',
    'For a named game, distinguish the reference features to preserve from the explicit changes requested. Put both into concrete mechanics and artDirection. A changed actor or verb is a requirement: do not silently restore the original win condition or chase relationship. Prioritize those requirements over optional extra moves and meters.',
    designCore(),
    designCatalogue(),
    'The selected cards are conditional guidance. Produce the required spec JSON, not prose or code. Include concrete tuning or limits in mechanics where helpful; preserve a complete, buildable game and its signature mechanics. For a remix, select guidance relevant to the requested changes and keep unrelated behavior unchanged.',
    'When a tested foundation is supplied, use its documented controls, scoring, action timing and round structure as the default. Do not invent extra meters, combo multipliers, secondary objectives or API wrappers just to fill the mechanics list. Preserve every explicit requested change; add new systems only when needed for that request. Existing tested rules already provide game feel and progression. Copy reward ownership, life-loss versus team-loss rules, stage counts and timeout behavior exactly from that contract unless the transcript explicitly asks to change them. A timer costing one life is not a team game-over. A shared clear bonus is not a rescuer-only bonus. Do not add an extra reward for an already-scored event. Check that mechanics, lose and scoring agree with one another and with every explicit number in the transcript.',
  ]
    .filter(Boolean)
    .join('\n\n')
  const user = [
    players === 2
      ? `The two players said: "${transcript.trim()}"`
      : `The person said: "${transcript.trim()}"`,
    opts.current
      ? `A game is already on screen: ${describeCurrent(opts.current)}. They may be asking to change it (remix) or for a different game.`
      : 'No game is on screen.',
    context.text,
    referenceContext(transcript, {}, false).text,
    catalogContext(transcript, { players, requireMultiplayer: true }).text,
  ]
    .filter(Boolean)
    .join('\n\n')
  return { system, user, context }
}

export async function specify(transcript: string, opts: SpecOptions = {}): Promise<SpecResult> {
  const t0 = now()
  const players: Players = opts.players === 2 ? 2 : 1
  const prompt = specPrompt(transcript, opts)
  const res = await withDeadline('spec', REQUEST_LIMITS.spec, opts.signal, (signal) =>
    openai().responses.create(
      {
        model: opts.model ?? MODELS.spec,
        reasoning: { effort: (opts.effort ?? MODELS.specEffort) as 'none' },
        instructions: prompt.system,
        input: prompt.user,
        text: {
          format: {
            type: 'json_schema',
            name: 'game_spec',
            strict: true,
            schema: specJsonSchema,
          },
        },
        prompt_cache_key: players === 2 ? 'htn-spec-2p-v6' : 'htn-spec-v6',
      },
      { signal },
    ),
  )
  const parsed = GeneratedGameSpecSchema.parse(JSON.parse(res.output_text))
  parsed.title = parsed.title.toUpperCase().slice(0, 14)
  parsed.note = parsed.note.toUpperCase().slice(0, 40)
  parsed.oneLiner = parsed.oneLiner.slice(0, 120)
  parsed.hook = (parsed.hook ?? '').slice(0, 160)
  parsed.ramp = (parsed.ramp ?? '').slice(0, 200)
  if (!opts.current) {
    parsed.remix = false
    parsed.changes = []
  }
  parsed.changes = parsed.changes.slice(0, 4)
  return {
    spec: { ...parsed, players },
    context: prompt.context,
    prompt: { system: prompt.system, user: prompt.user },
    ms: ms(t0),
    usage: {
      input: res.usage?.input_tokens ?? 0,
      output: res.usage?.output_tokens ?? 0,
      cached: res.usage?.input_tokens_details?.cached_tokens ?? 0,
    },
  }
}
