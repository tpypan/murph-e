# What makes an arcade game good

Research for the build prompt. Everything here is written to be *encodable*:
each section ends in rules the harness can put in front of a model, and the
last section is the checklist the fun probe and the judge test against.

The audience is a person standing at a cabinet who spoke a sentence and is now
holding a stick. They will play for somewhere between thirty seconds and three
minutes, once, in public, with people watching. That is the whole design brief.

## 1. The five things a good arcade game has

Distilled from the sources at the bottom, ordered by how much they move the
needle for a 200-line game.

### 1.1 A verb you can feel in the first second

Game feel is the moment-to-moment sensation of control: input, response, and
the animated, audible consequence. Steve Swink's framing is real-time control
of a virtual body plus "polish" — the effects that sell the impact. The
canonical demo is *Juice It or Lose It* (Jonasson and Purho, 2012), which takes
a dull Breakout clone and adds squash, particles, trails, shake and sound on
stage until the same game is compelling. Nothing about the rules changed.

Practically, in this runtime, feel is: acceleration and friction rather than
teleporting, a sprite that flips or squashes to face what it is doing, `sfx` on
every event, `flash` on reward, `shake` on damage, and a brief blink or freeze
so a hit reads.

The failure mode the harness sees most often is a game where the player is a
rectangle that moves at a constant speed and nothing else happens. It passes
the probe. It is not fun.

### 1.2 A decision, not just a reflex

Sid Meier's "a game is a series of interesting decisions". A decision is
interesting when the options are not dominated by one another — when you cannot
always pick the same one. Pure avoidance (dodge the falling things) is a reflex
test with one strategy: stay away. It gets boring in thirty seconds because, in
Raph Koster's terms, the player has finished learning the pattern, and fun *is*
the act of learning a pattern.

The cheapest way to add a decision to a tiny game is **risk/reward geometry**:
put the points where the danger is.

- Pac-Man: the power pellet inverts the chase; spend it now or bank it?
- Space Invaders: shooting the bottom row is safe, shooting the column edges is
  faster but exposes you.
- Asteroids: a big rock is easy to hit but splits into fast small ones.
- Galaga: let your ship be captured to get a double ship — a deliberate loss
  for a bigger payoff.

Every one of those fits in a few lines: a pickup that spawns close to a hazard,
a multiplier that resets when you get hit, a charge shot that is strong but
locks you in place, a magnet that pulls coins *and* enemies.

### 1.3 A ramp that starts gentle and never stops

Arcade games start easy and escalate fast, holding the player near the edge of
their ability — Csikszentmihalyi's flow channel, where challenge tracks skill.
Early play is a tutorial in disguise; the rules never get more complex, the
same rules get faster and denser.

Three levers, all of which the model already has via `api.t`:

- **Speed**: hazards move faster.
- **Density**: more hazards per second, tighter gaps.
- **Kind**: a second enemy type appears at 20 s, a third at 45 s, a boss-ish
  thing at 60 s. This is the one that matters most and the one models skip.

Two sub-rules that separate good ramps from bad ones:

- Escalate in **waves, not a straight line**. A moment of calm after a wave
  makes the next wave read as harder and gives the player a breath. Space
  Invaders' pace change as the formation thins is the classic version.
- Never cap the ramp at a level a competent player survives forever. An arcade
  game is a scoring instrument; every run must end.

### 1.4 A score that tells a story

The score is the only narrative an arcade game has. Flat scoring (one point per
pickup) tells no story. What works:

- **Multipliers and combos** — chain pickups without getting hit; the number
  climbing is the reward, and losing it is the punishment. Risk is created for
  free: the player takes chances to keep a streak alive.
- **Graded targets** — a far enemy is worth more than a near one, the small
  asteroid more than the big one.
- **Near-misses that pay** — points for a close dodge (Crazy Taxi, Burnout).
  The near-miss effect is well documented as a motivator: the player who almost
  succeeded tries again harder.
- **Visible, immediate feedback** — the points pop where the event happened.

### 1.5 A death you can argue with

Fairness is what converts a loss into another go. The player must believe the
death was theirs.

- **Telegraph**: anything that can kill announces itself — a flashing tile, a
  warning arrow at the edge, a wind-up frame — at least ~0.5 s ahead.
- **Read the screen**: hazards must contrast with the background; never spawn
  something lethal on top of the player or just off-screen ahead of them.
- **Forgive the edges**: hitboxes slightly smaller than the sprite,
  invulnerability frames after a hit, coyote time on ledges, an input buffer on
  jumps. Players do not notice these; they only notice their absence.
- **Lives and a short restart**: the loop is die-fast, restart-fast. Three
  lives cost nothing and triple a session.

## 2. What the classic genres actually do

One line each on the loop, and the thing that makes the good ones good. These
map onto the harness's genre list, which is why they are worth spelling out:
the model picks a genre and then usually writes the *shallowest* version of it.

| Genre | Loop | What makes it good | Shallow version to avoid |
|---|---|---|---|
| Fixed shooter (Space Invaders, Galaga) | Move on one axis, shoot up, formation descends | A formation that *reacts* — thins, speeds up, dives, shoots back | Endless identical enemies drifting down |
| Scrolling shmup | Move freely, weave bullets, kill waves | Bullet patterns you learn; power-ups that change the gun | One enemy type, one bullet, no patterns |
| Maze chase (Pac-Man) | Eat the maze, avoid chasers, invert with a power pellet | Chasers with *different* personalities; the pellet inversion | Random-walk enemies in an empty box |
| Dodge / catch (Kaboom!) | Stay alive under falling things, catch the good ones | Catching pays, and catching is dangerous | Dodge-only, no reason to move toward anything |
| Breakout | Bounce a ball into bricks with a paddle | Paddle english (hit position steers), brick types, multiball | One ball, one brick type, dead-centre bounce |
| Pong / duel | Return the ball, out-angle the opponent | Speed-up per rally, spin, a shrinking paddle | Constant speed, unloseable |
| Platformer | Jump between platforms, collect, avoid | A jump arc you can trust; coyote time; a reason to go up | Flat ground, one hazard, nothing above |
| Endless runner | Auto-run, time the jump | Rhythm — obstacle spacing you can read; a double-jump or slide | Random gaps, unfair spacing |
| Snake | Grow, do not collide with yourself | Self-inflicted difficulty; the board fills with your own mistakes | Fast snake, no bonus, no walls |
| Flappy | One button, gravity, gaps | Precision on a single input; instantly readable failure | Gap too small at t=0, no grace |
| Climber / Frogger | Cross lanes of traffic, reach the top | Lanes at different speeds; safe pockets; a timer pushing you on | One lane, one speed |
| Versus (2P) | Two players, one arena, a round that must end | A closing arena, a timer or a target score; symmetric controls | Two players who can both stall forever |
| Co-op (2P) | Two players, shared lives and score, escalating threat | Roles that differ slightly, or a threat that needs both sides | Two identical players who could each play alone |

Recurring structural devices worth stealing for a 200-line game:

- **Attract mode** — the cabinet shows the game playing itself. The runtime
  owns the title card here, but the *first frame of play* must look alive.
- **Waves** with a short lull and a visible "WAVE 2" beat.
- **Power-ups** as a temporary rule change (spread shot, shield, slow time,
  magnet), 5 to 10 seconds, always visible on screen while active.
- **A bonus item** that appears rarely and briefly (the Pac-Man fruit): a spike
  of tension and points that breaks the rhythm.
- **Extra life at a score threshold** — the cheapest possible long-term goal.

## 3. How this turns into prompt rules

Collapsed to the smallest set of instructions that changes behaviour. Every
line is a thing models reliably fail to do unless told.

1. Pick one **hook**: the single interesting decision. Write it down in the
   spec and make the code serve it.
2. Put the **points near the danger**. There must be a reason to move toward
   something risky.
3. Ship a **combo or multiplier** that builds on success and breaks on damage,
   and show it on screen.
4. Escalate with **at least three stages** over the first 60 seconds, and add a
   **new kind of thing**, not just more speed — in waves, with a lull.
5. Give the player **three lives** and invulnerability frames after a hit.
6. **Telegraph** anything lethal at least half a second ahead.
7. One **power-up or bonus item** that temporarily changes the rules.
8. **Feel**: acceleration/friction, a sprite that reacts, `sfx` on every event,
   `flash` on reward, `shake` on damage, particles on impact.
9. **Read**: the hazard colour must not be the background colour; the player
   must be the most contrasting thing on screen.
10. The game must be **losable** and must **never be capped** at survivable.

## 4. The checklist we test against

The fun probe (`packages/probe/src/playtest.ts`) and the judge
(`packages/harness/src/judge.ts`) score these. Mechanical first:

| Signal | How it is measured | Target |
|---|---|---|
| Grace | idle bot alive at 3 s | true |
| Losable | idle bot dead by 60 s | true |
| Agency | playing bot's score at 45 s vs idle bot's | bot clearly ahead, and > 0 |
| Reward rate | first score change under a bot | < 5 s |
| Ramp | events per second in the last third vs the first third | rising |
| Motion | distinct frame hashes over 10 s | many |
| Palette | distinct colours in a frame mid-play | >= 5 |
| Juice | `sfx` / `flash` / `shake` call sites in source | sfx >= 3 kinds, flash and shake present |
| Depth | distinct entity kinds, multiplier/combo present, power-up present | >= 2 kinds |

Then a model judge on three screenshots plus the source, 1 to 5 on: hook,
risk/reward, ramp, feel, readability, variety. The judge is a comparison
instrument, not a truth: the number only means something against another arm of
the same bench.

## Sources

- [Arcade Game Design fundamentals — gamedesignskills.com](https://gamedesignskills.com/game-design/arcade/)
- [Difficulty Curves — Game Developer](https://www.gamedeveloper.com/design/difficulty-curves)
- [Development of Difficulty in Games — Game Developer](https://www.gamedeveloper.com/design/development-of-difficulty-in-games)
- [Sid Meier on games as sets of interesting decisions (GDC 2012)](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)
- [Raph Koster, A Theory of Fun — summary](https://www.bookey.app/book/theory-of-fun-for-game-design)
- [Juice It or Lose It (Jonasson & Purho)](https://cobble.games/wise-inspiring-smart/game-design/juice-it-or-lose-it)
- [Making Games 'Juicy' — Joys of Small Game Development](https://abagames.github.io/joys-of-small-game-development-en/make_game_juicy.html)
- [Game feel — Wikipedia](https://en.wikipedia.org/wiki/Game_feel)
- [Action game — Wikipedia](https://en.wikipedia.org/wiki/Action_game)
- [Shoot 'em up — Wikipedia](https://en.wikipedia.org/wiki/Shoot_%27em_up)
- [Maze game — Wikipedia](https://en.wikipedia.org/wiki/Maze_games)
- [Breakout — Wikipedia](https://en.wikipedia.org/wiki/Breakout_(video_game))
- [Fixed shooters — Shmup wiki](https://shmup.fandom.com/wiki/Fixed_Shooters)
- [Near-miss effect — Wikipedia](https://en.wikipedia.org/wiki/Near-miss_effect)
- [The near-miss effect in slot machines (review)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7214505/)
- [Power Ups: The forgotten art — shmups.system11.org](https://shmups.system11.org/viewtopic.php?p=348806)
- [Arcade Game Mechanics Explained](https://content.shurzy.com/post/arcade-game-mechanics-explained)
- [Why retro arcade games felt harder](https://www.qualityarcades.com/blogs/news/remember-how-hard-arcade-games-used-to-be-in-the-80s-the-difficulty-levels-between-modern-games-and-retro-arcade-games)
