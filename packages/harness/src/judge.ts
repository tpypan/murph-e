import type { PlaytestMetrics } from '@htn/probe'
import { ms, now, openai } from './env.ts'
import type { GameSpec } from './spec.ts'

/**
 * A model judge for the part of "is this fun" that no counter can see: is
 * there a decision in here, does the screen read, does it look like anything.
 *
 * It is off the latency path and only ever used by the bench. The number is a
 * comparison instrument: it means something against another arm of the same
 * bench and nothing on its own. The rubric is section 4 of
 * docs/research/arcade-game-design.md.
 */

export const JUDGE_MODEL = process.env.HTN_JUDGE_MODEL ?? 'gpt-5.6-sol'
export const JUDGE_EFFORT = process.env.HTN_JUDGE_EFFORT ?? 'low'

const AXES = ['hook', 'riskReward', 'ramp', 'feel', 'readability', 'variety'] as const
export type Axis = (typeof AXES)[number]

export interface Verdict {
  scores: Record<Axis, number>
  /** Mean of the six axes, 1 to 5. */
  mean: number
  /** 1 to 5: would a person at a cabinet put in another go. */
  again: number
  best: string
  worst: string
  ms: number
}

const INSTRUCTIONS = `You are judging a tiny 8-bit arcade game written for a cabinet at a hackathon. Someone spoke one sentence and this game came out. They will play it once, standing up, for about a minute, with people watching.

You get the spec, the source, three screenshots taken at about 2 s, 15 s and 40 s of play by a bot that waggles the stick and mashes the buttons, and mechanical measurements from two headless playthroughs.

Score six axes from 1 to 5. Be harsh: 3 is a competent, unremarkable game of this kind, 5 is genuinely good, 1 is broken or empty. Most generated games are 2 or 3. Do not give credit for intent in the spec that the code does not carry out; read the source and check.

- hook: is there one interesting thing to do, or is it the shallowest possible version of its genre? A game where the only strategy is "avoid everything" or "hold fire" scores 2.
- riskReward: is there a reason to move toward danger? Points near hazards, a combo or multiplier that breaks when hit, a greedy option that can backfire. A game where the safe play is also the high-scoring play scores 1 or 2.
- ramp: does it escalate over the first minute, and does it escalate in kind (a new enemy, a new pattern, a wave) rather than only in speed? Does it stay winnable-forever at some point? That caps it at 2.
- feel: acceleration and friction rather than teleporting, sprites that react, sfx on every event, flash on reward, shake on damage, particles or debris on impact, invulnerability frames.
- readability: can you tell at a glance what is the player, what hurts, and what pays? Contrast against the background, no lethal thing spawning on top of the player, hazards telegraphed before they can kill.
- variety: more than one kind of thing on screen, more than one thing to react to, a power-up or bonus item, a backdrop with some detail.

Then rate "again" 1 to 5: would this person put in another go. Give one short line for the best thing about it and one for the worst. Keep both under 90 characters and concrete.`

const schema = {
  type: 'object',
  additionalProperties: false,
  required: [...AXES, 'again', 'best', 'worst'],
  properties: {
    ...Object.fromEntries(
      AXES.map((a) => [a, { type: 'integer', minimum: 1, maximum: 5 }] as const),
    ),
    again: { type: 'integer', minimum: 1, maximum: 5 },
    best: { type: 'string' },
    worst: { type: 'string' },
  },
} as const

/** The measurements, in words, so the judge is anchored to the same run. */
function describeMetrics(m: PlaytestMetrics): string {
  return [
    `idle player dies after: ${m.idleDeathS === null ? 'never (survived 75 s doing nothing)' : `${m.idleDeathS} s`}`,
    `bot dies after: ${m.botDeathS === null ? 'never' : `${m.botDeathS} s`}`,
    `points per second alive, bot vs idle: ${m.agency} (below 1 means standing still scores better)`,
    `first point at: ${m.firstScoreS === null ? 'never' : `${m.firstScoreS} s`}`,
    `distinct score amounts: ${m.scoreTiers} (1 means every point is worth the same)`,
    `largest score over smallest: ${m.scoreSpread}`,
    `share of screen that is not background, early -> late: ${m.busyEarly} -> ${m.busyLate}`,
    `colours on screen mid-play: ${m.colors}`,
    `sound effects played: ${m.sfxCalls} across ${m.sfxKinds} kinds; flash ${m.flash}, shake ${m.shake}`,
  ].join('\n')
}

export async function judge(
  spec: GameSpec,
  code: string,
  metrics: PlaytestMetrics,
  opts: { model?: string; effort?: string } = {},
): Promise<Verdict> {
  const t0 = now()
  const content: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: [
        '=== SPEC ===',
        JSON.stringify(
          {
            title: spec.title,
            genre: spec.genre,
            oneLiner: spec.oneLiner,
            mechanics: spec.mechanics,
          },
          null,
          2,
        ),
        '',
        '=== MEASUREMENTS ===',
        describeMetrics(metrics),
        '',
        '=== SOURCE ===',
        '```js',
        code.trim(),
        '```',
        '',
        metrics.shots.length > 0
          ? 'Three screenshots follow, at about 2 s, 15 s and 40 s of bot play.'
          : 'No screenshots were captured.',
      ].join('\n'),
    },
    ...metrics.shots.map((url) => ({ type: 'input_image', image_url: url })),
  ]
  const res = await openai().responses.create({
    model: opts.model ?? JUDGE_MODEL,
    reasoning: { effort: (opts.effort ?? JUDGE_EFFORT) as 'low' },
    instructions: INSTRUCTIONS,
    input: [{ role: 'user', content }] as never,
    text: { format: { type: 'json_schema', name: 'verdict', strict: true, schema } },
    prompt_cache_key: 'htn-judge-v1',
  })
  const raw = JSON.parse(res.output_text) as Record<string, number | string>
  const scores = Object.fromEntries(
    AXES.map((a) => [a, Math.max(1, Math.min(5, Number(raw[a]) || 1))]),
  ) as Record<Axis, number>
  const mean = AXES.reduce((a, k) => a + scores[k], 0) / AXES.length
  return {
    scores,
    mean: Math.round(mean * 100) / 100,
    again: Math.max(1, Math.min(5, Number(raw.again) || 1)),
    best: String(raw.best ?? '').slice(0, 120),
    worst: String(raw.worst ?? '').slice(0, 120),
    ms: ms(t0),
  }
}

export const JUDGE_AXES = AXES
