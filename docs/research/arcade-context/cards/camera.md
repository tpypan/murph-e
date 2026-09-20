# Camera and useful visible space

Evidence: [Itay Keren's Scroll Back](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers) describes camera windows, forward focus and context-dependent framing.

Proposed application:

- Use a fixed camera for a one-screen arena unless scrolling serves the requested mechanic.
- For a runner or swinging game, reserve visible space toward the next landing or anchor. Small input reversals should not whip the camera back and forth.
- Decide whether jumps move the camera, and when landing establishes a new vertical reference. Keep score/control UI independent of world movement.
- Treat visible lead time as part of fairness: a reachable landing is still unfair if revealed too late to act.

Checks: destination visible before commitment; rapid left/right alternation; highest jump; lowest fall; screen-edge hazards; HUD safe area. Camera recipes are conditional, not a requirement to add scrolling to every arcade game.
