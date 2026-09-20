# Maze and snake movement

Our proposed engineering recipe, using explicit state transitions and the [runtime simulation principles](simulation.md). Historical ghost behaviors are covered separately in [enemy roles](enemy-roles.md).

- Define tile occupancy independently from sprite animation. Buffer the intended turn until a legal junction or movement tick.
- Maze movement may permit immediate reversal; snake movement usually rejects reversal into its neck. Choose according to the requested mechanic.
- For snake, decide whether entering the cell vacated by the tail on this tick is legal. Evaluate growth before applying that rule.
- Spawn pickups only in reachable eligible cells. Handle a full board as a terminal state instead of an endless random-placement loop.
- Speed changes adjust a bounded movement interval; drawing stays at the runtime's cadence.

Checks: two rapid turns before one tick, blocked turn buffering, tail-vacating move, growth collision, full board, disconnected pickup, restart. Never add an arbitrary A action solely to claim the game uses two buttons; negotiate a meaningful design in the plan.
