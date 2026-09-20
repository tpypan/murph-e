# DC DUEL: quality audit and evaluation plan

Audited 2026-09-19. Input: Street Fighter with Batman, Superman and Flash.
Run: `runs/2026-09-19-1951-basically-i-want-to-create-a-gam`.
This is an audit, not a production prompt change or a model-training run.

## What the actual run did

Luna none produced a fighting specification. Astra low emitted 472 lines / 6,507
output tokens in 124 seconds. Candidate 1 passed the probe in 446 ms and won the
race; total delivery took 134.38 seconds. The other candidate was cancelled.
The only recorded warning was `pressing B changed nothing on screen`.

The old genre/short-file restriction is no longer the explanation: this run has
the correct genre, larger characters, no line-count target, a visual plan and
combat rules. The remaining problem is the specificity and consistency of that
plan, visual execution, and what qualifies a candidate for delivery.

## Findings from the exact source

| Finding | Evidence | Consequence |
| --- | --- | --- |
| One shared block-shaped character rig | `game.js:282–379`: rectangular torso/head/boots, thick straight limbs; type switches mainly change costume, logo, cape and special | Identity is mostly colour/emblem-based, with little character-specific anatomy, stance or acting |
| Weak pose progression | `game.js:297–350`: sine-wave stride/bob, a few hand positions; the torso barely articulates | Movement exists, but windup, contact and recovery do not read as a crafted sequence |
| Punch picture and collision disagree | collision at ages 5–8 (`152`); extended-hand rendering begins at age 4 and continues while the quick action exists (`301`, `348`) | The punch still looks extended at ages 9–15 when it cannot connect |
| Feet obscured by a drawing choice | `game.js:290`: `circfill(x,189,15,0)` | A full 30-pixel black disk, not a flattened ground shadow, swallows the boots and foreground |
| Stage art was explicitly simplified | `spec.json` artDirection requests dark, low-detail floor/skyline; `game.js:381–403` repeats building boxes and sparse windows | Much of the frame becomes empty sky or black silhouettes; low contrast hides parts of Batman |
| No actual visual reference supplied | `prompt.txt` is text; `build.ts` supplies a string input with no images or tool stage | The model invents the appearance from memory despite cards telling it to inspect reference images |
| Declared and implemented mechanics differ | Spec mentions throws but provides no throw mapping/implementation; says both best-of-three and losing all three rounds; regeneration wording differs from code | The planner creates ambiguous obligations that neither builder nor checker resolves |
| No cabinet completion signal | internal `victory`/`defeat` modes at `214–225`, no `api.win()` / `api.gameOver()` calls anywhere | The normal cabinet result/score-submission flow never receives those endings |
| The probe can pass the selection screen | init sets mode=`select`; directional checks change character selection; the first A enters the match; B is a soft check | A pass does not establish working combat, blocking, special moves or complete rounds |

Controlled execution results are saved in
`bench/audits/dc-duel/behavior.json`. These ran the original code in a
timeout-bounded JavaScript VM with recorded API calls and deliberately controlled
internal states, not a full playthrough. They confirm:

- After 300 idle updates: still selecting a character, zero fighters instantiated.
- A direction changes selection; the first A starts a round without an attack.
- At quick-attack ages 5/8 an in-range opponent takes six damage; at 9/12 it takes
  zero, while the drawn hand has identical coordinates.
- Both terminal modes make zero calls to the shell's win/gameOver API.
- Health still regenerates ten seconds after the last hit, rather than a bounded
  two-second recovery window as one reading of the spec would imply.

The final point is partly a specification ambiguity; it should be resolved in
the spec instead of grading the builder against an inferred interpretation.

## What is missing from the prompt and inputs

The current prompt already says recognizable silhouettes, shading, animation,
attack states and hit feedback. Adding more adjectives is unlikely to resolve
the observed gaps. Replace vague requirements with evidence and shared data:

1. **A concrete visual reference pack.** Supply actual inspected images and/or
   approved original sprite examples, with provenance. State the intended visual
   target: detailed arcade pixel art, rather than an unspecified "8-bit" look.
   Resolution, colour budget, character scale and animation style are separate
   choices. Keep this cached, not a fresh research chain on every generation.
2. **Character-specific art requirements.** Define proportions, stance, facial
   profile, hands/feet, silhouette landmarks and lighting. Require a pose contact
   sheet that can be reviewed without labels. For this close-up fighter, compare
   a larger 70–85px composition against the current ~55px figures; this is an
   experiment, not a universal sprite-size requirement.
3. **One source of truth for action timing.** A move record should define startup,
   active and recovery intervals, pose sequence, hitbox/hurtbox, damage and sound.
   Drawing and combat use that record rather than independent age comparisons.
4. **Explicit lifecycle and input contracts.** Menus must be traversable by the
   verifier; required actions must be tested in their eligible state; terminal
   outcomes call the cabinet API exactly once. Decide round/tournament ownership
   up front. Declare throws only when a real input and rule exist.
5. **Scene composition rather than low detail.** Quiet values around combat,
   readable background architecture, grounded perspective and thin floor shadows.
   Avoid confusing low contrast with lack of detail. Extra decoration is not a
   substitute for strong composition.

Candidate prompt addition to A/B test, not yet applied:

> Use the supplied visual reference pack and state which visible features each
> asset must preserve. Give each fighter a distinct silhouette and stance. Build
> readable anticipation, contact and recovery poses with stable foot anchors.
> Drive animation and damage eligibility from the same move-state data. An attack
> must visibly recover when its active hitbox ends. Use shallow ground shadows
> that never obscure feet. Keep stage values subordinate to the fighters while
> preserving recognizable architecture. Report match victory/defeat through the
> supplied runtime API. Implement and verify every declared mechanic in its
> eligible game state; do not count a menu transition as proof of that mechanic.

This addition depends on a real reference pack and state-aware verifier. It
must not falsely imply the current builder has image retrieval or tools.

## Evaluation before reinforcement learning

Current selection is **first candidate to pass basic checks**, not best art or
gameplay. There are no parameter updates and no learned reward model. Saving
outputs and editing prompts is evaluation-driven development, not RL training.

Use DC DUEL as a failure case, including its misleading passing probe. Build an
offline set of roughly 20–30 prompts spanning genres, character references and
unfamiliar requests. Hold out identities/themes and some mechanic combinations
so improvement cannot mean memorizing Batman or this particular fighter.

Use three independent forms of evidence:

- **Hard correctness gates:** load, bounded execution, intended gameplay reached,
  each essential action has its expected effect, sensible single-hit behavior,
  reset, victory/defeat, shell notification. A selection-screen pixel change
  cannot satisfy a combat requirement. Essential B actions are hard requirements.
- **Rendered visual comparisons:** same native resolution, same selected poses
  and short gameplay clips. Judge identity without name labels, proportions,
  silhouette/contrast, coherent lighting, pose clarity and stage composition.
  Use blinded A/B preferences with swapped presentation order and human-labelled
  examples. Pixel count, colour count and moving-pixel count are not art rewards.
- **Gameplay scenarios and human play:** confirm meaningful action differences,
  visible contact matching damage, block and punish opportunities, useful specials,
  opponent variety, recovery periods and a complete round. Try idle, repeated
  attack, repeated block, movement and mixed strategies across seeds. One cheap
  script should not win every matchup by accident. Human feedback still decides
  whether the result is enjoyable.

Record prompt/context versions, code hash, seed/input trace, native frames/clips,
latency, tokens, hard failures, dimension scores and pairwise preferences. Treat
latency as a constraint/tradeoff, not a reward that can compensate for a broken
game. Do not collapse all qualities into a weighted score before calibrating
agreement with human judgments.

The official [evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
recommends specific criteria, comparison-based grading and calibration against
human labels. This supports the proposed method; it does not validate our
particular arcade scorecard in advance.

## Lean implementation order

1. Add state-aware fight/lifecycle regression cases and make this game's false
   pass fail for the demonstrated reasons. Check existing games and known-bad
   fixtures before changing delivery gates.
2. Author one excellent small fighting reference using the existing runtime:
   validated pose/move data, hitboxes, foot anchoring and terminal transitions.
   Cache reusable primitives, not a fixed menu of permitted genres. The model
   still supplies new identities, mechanics, parameters and scene arrangements.
3. Supply the reference pack, then A/B the proposed prompt on fixed and held-out
   cases. Compare rendered output and actual play, with latency reported.
4. Replace unconditional first-pass racing with a bounded quality-selection
   experiment: compare both when ready within a defined wait window. Keep ranking
   offline until it is calibrated; otherwise another judge adds delay without
   dependable selection.
5. Only then consider weight-level training. As checked for this audit, the
   public [RFT guide](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
   documents o4-mini support, not Astra. Do not assume this Astra deployment can
   be fine-tuned through that API. Prompt/reference optimization and candidate
   selection can improve the current system without changing its model.

No engine migration is justified by this one case. The current API can draw more
deliberate pixel art and better poses. Its fixed global 16-colour palette is a
real constraint, but changing it alone would leave the demonstrated state,
timing, lifecycle, reference and evaluation failures intact.
