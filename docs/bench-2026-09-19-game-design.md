# Bench 2026-09-19: baking arcade game design into the build prompt

What changed, what it bought, and what it cost. The design reasoning is in
`docs/research/arcade-game-design.md`; this file is the measurement.

## The problem

The probe answers "does this game work". Every bench before this one was green
on that and said nothing about whether the game was worth playing. Measuring
first turned out to matter more than any of the prompt edits: the control arm
is a wall of games that pass the probe and are boring in a specific, countable
way.

Control arm, 20 prompts x 2 (`bench/results/2026-09-19-1636-AB-control.md`):

- 27 of 40 games could be lost at all by a player who never touched the stick.
- Mean number of distinct point values in a game: 2.3. Most scoring was flat.
- Judge: ramp 2.15, riskReward 2.75, hook 2.73 out of 5. Feel and readability
  were already fine (3.70, 3.53) — the polish rules in the house rules were
  working, the design rules did not exist.

## What was added

1. **Two spec fields**, `hook` and `ramp` (`packages/harness/src/spec.ts`). The
   spec model now has to name the one interesting decision and the three stages
   of the first minute before the build model sees the request.
2. **A Design block at the top of the house rules**
   (`packages/harness/src/prompt.ts`): playing must beat standing still, points
   go where the danger is, a combo that breaks when you are hit, three stages
   that add a new *kind* of thing, one rule-changing bonus, telegraphing, and a
   restatement that the screen must not be still.
3. **Two rewritten exemplar templates**, `library/templates/dodge.js` and
   `shooter.js`. These ride in every one-player prompt, and they used to
   contradict the new rules: flat scoring, no combo, one hazard type, and a
   SKY FALL that an idle player survived indefinitely. They now carry a
   draining fuel bar (so there is no safe corner), pies that fall in the anvil
   lanes, a near-miss payment, a combo, three hazard stages, telegraphed bombs
   and a shield pickup.
4. **A tighter line budget**, 140 to 200 for one player and 170 to 230 for two.
   Without it the design rules cost 17 s of p50 (see "what did not work").

## The instrument

- `packages/probe/src/playtest.ts` — plays each game twice, once with a bot on
  the sticks and once with nobody, and reports grace, losability, points per
  second alive of bot over idle, time to first point, distinct score amounts,
  screen density early vs late, colours, motion and juice. `pnpm playtest
  <game.js>` prints it for one file. Probe-only telemetry in the runtime counts
  `sfx`/`flash`/`shake` calls and every score change, so none of this is
  guessed from the source text.
- `packages/harness/src/judge.ts` — a model judge over the spec, the source and
  three screenshots, scoring hook, riskReward, ramp, feel, readability and
  variety 1 to 5 plus "would they put in another go". It is a comparison
  instrument: the number means something against another arm of the same bench
  and nothing on its own.
- `pnpm harness bench <prompts> --fun` runs both. It is off the cabinet's
  latency path entirely.

## Result, one player

20 prompts x 2 runs, `gpt-5.6-sol`, effort `none`. Control is `main` as of
89c0bf0; design is this branch.

| | control | design | |
|---|---|---|---|
| total p50 | 29.9 s | **28.5 s** | faster |
| total p95 | 33.4 s | 33.2 s | |
| lines mean | 274 | 237 | |
| output tokens mean | 2441 | 2634 | |
| probe pass | 40/40 | 39/40 | |
| fun score mean | 67.7 | 69.4 | |
| losable by an idle player | 27/40 | **31/40** | |
| distinct point values | 2.30 | **3.88** | |
| judge mean | 2.99 | **3.33** | |
| judge: would play again | 2.65 | **3.00** | |
| judge: hook | 2.73 | **3.13** | |
| judge: riskReward | 2.75 | **3.48** | |
| judge: ramp | 2.15 | **3.20** | |
| judge: variety | 3.08 | **3.58** | |
| judge: feel | 3.70 | 3.43 | worse |
| judge: readability | 3.53 | 3.18 | worse |

Files: `bench/results/2026-09-19-1636-AB-control.md` and
`2026-09-19-1655-AB-design-v3.md`.

One caveat on "distinct point values": it can only count score amounts the bot
actually triggered, so it reads 0 whenever the bot never scores. That happened
in 9 of 40 control runs and 11 of 40 design runs, and the design arm's median
run had fewer score events (4 against 6) because its games are harder to score
in by flailing. Counting only the runs where the bot scored at all, distinct
point values are 2.97 against 5.34 and the largest-over-smallest spread is 2.0
against 6.0 — so the raw means above understate the change rather than
manufacture it.

The latency rule is satisfied without an excuse: p50 went *down* 1.4 s, because
the line budget takes out more decoration than the design rules put back.

## Result, two players

12 prompts, one run each, so these move around more than the numbers above.

| | control | design |
|---|---|---|
| total p50 | 24.1 s | 25.8 s |
| probe pass | 9/12 | 12/12 |
| distinct point values | 1.58 | 5.92 |
| judge mean | 3.02 | 3.38 |
| judge: would play again | 2.92 | 3.17 |
| judge: ramp | 2.42 | 3.33 |
| judge: variety | 2.92 | 3.58 |

Files: `bench/results/2026-09-19-1700-AB-control-2p.md` and
`2026-09-19-1657-AB-design-v3-2p.md`. Two-player pass rate is noisy: the same
control prompt scored 11/12 in the morning run and 9/12 here, so read 12/12 as
"no regression", not as a win.

## Remix

The remix path runs through `specify()`, so it needed checking:
`bench/results/2026-09-19-1859-design-v3-remix.md` is 10/12 remixed, 2 correctly
reclassified as new games, 98% of the original kept — identical correctness to
the pre-change run.

Remix p50 read 11.8 s against 6.7 s in the morning run
(`2026-09-19-0915-remix.md`), which looked like a regression. It is not ours:
re-running the bench with `main`'s `spec.ts` swapped back in, minutes later,
gives 11.5 s (`2026-09-19-1906-control-remix-now.md`). The API was simply
slower in the evening — the same drift shows up in the build arms, where
today's control p50 is 29.9 s against 26 s in the morning. Every comparison in
this document is between arms run within the same hour for that reason.

The spec is now told to leave `hook` and `ramp` empty when `remix` is true,
since nothing on the remix path reads them. That was tried as a latency fix and
did not measurably help; it is kept because asking a model for fields nobody
reads on the one path where the person is watching a game change is wrong on
principle, not because the bench moved.

## What did not work

- **Skipping `hook` and `ramp` on remixes** did nothing for remix p50 (13.3 s
  against 11.8 s with them, inside the noise of this 12-job bench).
- **The design rules on their own** (`2026-09-19-1600-design-rules.md`) bought
  most of the judge improvement but pushed games from 274 to 340 lines and p50
  from 28.9 s to 46.2 s. Unusable at that price.
- **Asking for particles on every impact** cost lines and moved `feel` not at
  all. Dropped.
- **Compressing the dodge template's sprites to 6x6** to buy back lines cost
  0.63 of judged readability — the judge said "tiny sprites" over and over.
  Reverted to 8 wide by 6 tall, which still fits one source line per sprite.
- Two probe failure modes got *worse* under the first tight budget: games that
  start still, and controls the spec names that the code ignores. Both needed
  the rule restated where the model was actually looking (in the Design block,
  and in the spec instructions) rather than left in the Feel section.

## What is still wrong

- `feel` and `readability` are both about a third of a point below control.
  The games are busier and the model spends its budget on systems. Worth one
  more pass.
- Density ramp barely moves (1.02 to 1.03). Either games do not actually put
  more on screen over time, or share-of-non-background pixels is too blunt to
  see it.
- The playtest bot is a stick-waggler. It cannot play Snake, so `agency` and
  `scoreTiers` are uninformative for games that need competence to score at
  all — about a quarter of runs. Both should be read conditional on the bot
  having scored, and a small bench (six prompts) can swing wildly on bot luck
  alone.
- The judge is one model scoring 1 to 5 with no human calibration. It ranks
  arms consistently; it does not mean a 3.33 game is good.
