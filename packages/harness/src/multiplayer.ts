import { z } from 'zod'

export const REQUIRED_PLAYER_MODES = [1, 2] as const

/** Optional on historical specs, mandatory on every newly generated spec. */
export const MultiplayerPlanSchema = z.object({
  mode: z.enum(['coop', 'versus']),
  solo: z.string().trim().min(1).max(400),
  playerOne: z.string().trim().min(1).max(300),
  playerTwo: z.string().trim().min(1).max(300),
  camera: z.enum(['shared', 'split']),
  scoring: z.string().trim().min(1).max(400),
  endConditions: z.string().trim().min(1).max(400),
})

export const multiplayerJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'solo', 'playerOne', 'playerTwo', 'camera', 'scoring', 'endConditions'],
  properties: {
    mode: { type: 'string', enum: ['coop', 'versus'] },
    solo: {
      type: 'string',
      description:
        'How the same game works with one human: solo balancing, a CPU opponent or an AI partner, with no wait for absent P2.',
    },
    playerOne: {
      type: 'string',
      description: 'Concrete role and actions of human player one in two-player mode.',
    },
    playerTwo: {
      type: 'string',
      description:
        'Concrete role and actions of human player two; real independent agency, not a spectator or mirrored input.',
    },
    camera: { type: 'string', enum: ['shared', 'split'] },
    scoring: {
      type: 'string',
      description:
        'Who owns points, health/lives and objectives in both modes; preserve foundation rules.',
    },
    endConditions: {
      type: 'string',
      description:
        'How solo and multiplayer win, lose, resolve ties and reset; what happens if one teammate is eliminated.',
    },
  },
}

export const MULTIPLAYER_DESIGN_RULES = `MULTIPLAYER FROM THE START
Every newly generated game must support BOTH api.players=1 and api.players=2 in the SAME game.js. The cabinet menu selects the active session, not the game's supported modes. Design both before writing code, including when only one person is playing now.
- Fill multiplayer with a concrete co-op or versus mode, each human's role, solo adaptation, shared/split camera, score/life ownership and end/reset conditions. Preserve explicit cooperative or competitive intent. Choose an appropriate mode when unspecified: shared objectives for adventures/cooking, competition for racing/sports, independent boards or meaningful roles for puzzles. Never erase the requested core mechanic to add a second player.
- In solo mode, use suitable solo balancing, a CPU opponent or an AI partner. Never wait for absent player two. Both modes use the same core rules and assets.
- In two-player mode, both humans have independent input and meaningful actions, visible identities and fair spawn/starting states. No dummy second sprite, spectator, mirrored controller, or CPU controlling a human slot. State, inventory, cooldowns and scores must have explicit player/team ownership.
- The same d-pad/A/B mapping applies to each player. Read all human inputs with an explicit player index; create/reset actors from api.players at init, never hardcode the currently selected count. START and the mode menu are owned by the cabinet; do not add another start or player-count gate.
- Use only foundations verified for both 1P and 2P. Preserve their mode-specific rules and controls. Every new build and repair is checked in both modes before acceptance. These checks detect runtime/input failures; authored behavior tests still establish rules, fairness and full match completion.`
