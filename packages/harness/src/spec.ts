import { z } from 'zod'
import { MODELS, ms, now, openai } from './env.ts'

export const GENRES = [
  'dodge',
  'shooter',
  'platformer',
  'snake',
  'breakout',
  'runner',
  'pong',
  'flappy',
] as const
// Two-player genres. The cabinet's 1P/2P choice picks the list; the model
// never mixes them.
export const GENRES_2P = ['versus', 'coop'] as const
export const ALL_GENRES = [...GENRES, ...GENRES_2P] as const
export type Genre = (typeof ALL_GENRES)[number]
export type Players = 1 | 2

export const GameSpecSchema = z.object({
  title: z.string().min(1),
  oneLiner: z.string().min(1),
  genre: z.enum(ALL_GENRES),
  mechanics: z.array(z.string()).min(1),
  controls: z.object({
    left: z.string().nullable(),
    right: z.string().nullable(),
    up: z.string().nullable(),
    down: z.string().nullable(),
    a: z.string().nullable(),
    b: z.string().nullable(),
  }),
  palette: z.enum(['arcade', 'gameboy', 'nes', 'cga']),
  lose: z.string(),
  scoring: z.string(),
  moderated: z.boolean(),
  note: z.string(),
})
export type GameSpec = z.infer<typeof GameSpecSchema> & { players: Players }

// Hand-written so it is strict-mode valid: every property required, no extras.
const jsonSchema = (genres: readonly string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'oneLiner',
    'genre',
    'mechanics',
    'controls',
    'palette',
    'lose',
    'scoring',
    'moderated',
    'note',
  ],
  properties: {
    title: { type: 'string', description: 'Uppercase, at most 14 characters, shown on screen.' },
    oneLiner: { type: 'string', description: 'One sentence a player would read on a cabinet.' },
    genre: { type: 'string', enum: [...genres] },
    mechanics: {
      type: 'array',
      items: { type: 'string' },
      description: '3 to 5 short lines: what moves, what hurts, what scores, how it ramps.',
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
  },
})

export const SPEC_INSTRUCTIONS = `You turn what a person said into a spec for a tiny one-screen 8-bit arcade game that a second model will write in one go. The game runs at 256x224 with a 16-colour palette, a d-pad and two buttons (A, B), single player.

Rules:
- Keep the person's idea. Their nouns become the sprites and the theme. Their verbs become the mechanics.
- Pick the closest genre from the list. If the request is bigger than one screen (open world, RPG, 3D, story, crafting, levels), keep the theme and shrink it to one arcade loop; say what you did in note.
- If the request is for two or more players, make it one player against the computer and set note to MADE IT ONE PLAYER.
- If the request is vague ("something with cats", "a relaxing game"), invent a concrete, charming game that fits.
- The player must be able to lose within about 30 seconds and to score within 5. Difficulty ramps with time.
- title: at most 14 characters, uppercase, punchy. oneLiner: one sentence. mechanics: 3 to 5 short lines.
- controls: describe what each input does or null if unused. Always use left/right or up/down, and A must do something.
- palette is only a colour mood hint.
- Moderation: if the request is hateful, sexual, about real people, about self-harm, about real-world violence such as shootings or attacks on people or places, or is not a game at all, do not make that game. Replace it with an unrelated, wholesome arcade game, set moderated to true, and set note to LET'S PLAY THIS INSTEAD. Cartoon action such as shooting asteroids, zapping aliens or bonking slimes is fine.`

export const SPEC_INSTRUCTIONS_2P = `You turn what two people said into a spec for a tiny one-screen 8-bit arcade game for exactly two players that a second model will write in one go. The game runs at 256x224 with a 16-colour palette. Each player has their own d-pad and two buttons (A, B). Both players share the one screen and one arena: no split screen.

Rules:
- Keep their idea. Their nouns become the sprites and the theme. Their verbs become the mechanics.
- Pick the genre: "versus" when the two players compete and one wins, "coop" when they work together against the game and share a score and a loss. If they did not say, pick whichever fits the theme better; a fighting, racing or duelling idea is versus, a defending, surviving or collecting-together idea is coop.
- If the request is bigger than one screen (open world, RPG, 3D, story, crafting, levels), keep the theme and shrink it to one arcade loop; say what you did in note.
- If the request is for one player, or for more than two, make it two players and set note to MADE IT TWO PLAYERS.
- If the request is vague ("something fun for us"), invent a concrete, charming two-player game that fits.
- Versus: a round must be decidable within about a minute, and it must be impossible to stall forever (a closing arena, a timer, or points that keep coming). Coop: the pair must be able to score within 5 seconds and lose within 30 seconds if they stand still, ramping with time.
- title: at most 14 characters, uppercase, punchy. oneLiner: one sentence that mentions both players. mechanics: 3 to 5 short lines, and one of them must say what player one and player two each are.
- controls: describe what each input does for a player (both players have the same controls) or null if unused. Always use left/right or up/down, and A must do something.
- palette is only a colour mood hint.
- Moderation: if the request is hateful, sexual, about real people, about self-harm, about real-world violence such as shootings or attacks on people or places, or is not a game at all, do not make that game. Replace it with an unrelated, wholesome two-player arcade game, set moderated to true, and set note to LET'S PLAY THIS INSTEAD. Cartoon action such as shooting asteroids, zapping aliens, sword duels or bonking slimes is fine.`

export interface SpecResult {
  spec: GameSpec
  ms: number
  usage: { input: number; output: number; cached: number }
}

export interface SpecOptions {
  model?: string
  effort?: string
  /** Set by the cabinet's 1P/2P menu, never inferred from the transcript. */
  players?: Players
}

export async function specify(transcript: string, opts: SpecOptions = {}): Promise<SpecResult> {
  const t0 = now()
  const players: Players = opts.players === 2 ? 2 : 1
  const genres = players === 2 ? GENRES_2P : GENRES
  const res = await openai().responses.create({
    model: opts.model ?? MODELS.spec,
    reasoning: { effort: (opts.effort ?? MODELS.specEffort) as 'none' },
    instructions: players === 2 ? SPEC_INSTRUCTIONS_2P : SPEC_INSTRUCTIONS,
    input:
      players === 2
        ? `The two players said: "${transcript.trim()}"`
        : `The person said: "${transcript.trim()}"`,
    text: {
      format: { type: 'json_schema', name: 'game_spec', strict: true, schema: jsonSchema(genres) },
    },
    prompt_cache_key: players === 2 ? 'htn-spec-2p-v1' : 'htn-spec-v1',
  })
  const parsed = GameSpecSchema.parse(JSON.parse(res.output_text))
  parsed.title = parsed.title.toUpperCase().slice(0, 14)
  parsed.note = parsed.note.toUpperCase().slice(0, 40)
  parsed.oneLiner = parsed.oneLiner.slice(0, 120)
  parsed.mechanics = parsed.mechanics.slice(0, 6)
  if (!(genres as readonly string[]).includes(parsed.genre)) parsed.genre = genres[0]
  return {
    spec: { ...parsed, players },
    ms: ms(t0),
    usage: {
      input: res.usage?.input_tokens ?? 0,
      output: res.usage?.output_tokens ?? 0,
      cached: res.usage?.input_tokens_details?.cached_tokens ?? 0,
    },
  }
}
