import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { SFX_BANK, SFX_EVENTS, SFX_NAMES } from '../../runtime/src/sound-bank.ts'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export const SOUND_BANK_HASH = hash(JSON.stringify(SFX_BANK))

/** Recipes are original procedural assets, also compiled into the offline runtime. */
export function ensureAudioTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sound_effects (
      id TEXT PRIMARY KEY, format TEXT NOT NULL, recipe_json TEXT NOT NULL,
      content_hash TEXT NOT NULL, event_hint TEXT NOT NULL,
      source_path TEXT NOT NULL, provenance TEXT NOT NULL, indexed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_audio_checks (
      source TEXT NOT NULL, game_id TEXT NOT NULL, players INTEGER NOT NULL,
      code_hash TEXT NOT NULL, runtime_hash TEXT NOT NULL, bank_hash TEXT NOT NULL,
      passed INTEGER NOT NULL, observed_cues_json TEXT NOT NULL, tone_count INTEGER NOT NULL,
      evidence_json TEXT NOT NULL, checked_at TEXT NOT NULL,
      PRIMARY KEY (source, game_id, players, code_hash)
    );
    CREATE INDEX IF NOT EXISTS audio_checks_code ON game_audio_checks(code_hash);
  `)
}

export function indexSoundBank(db: DatabaseSync): number {
  ensureAudioTables(db)
  const insert = db.prepare(`INSERT INTO sound_effects
    (id, format, recipe_json, content_hash, event_hint, source_path, provenance, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET format=excluded.format, recipe_json=excluded.recipe_json,
      content_hash=excluded.content_hash, event_hint=excluded.event_hint,
      source_path=excluded.source_path, provenance=excluded.provenance,
      indexed_at=excluded.indexed_at`)
  for (const id of SFX_NAMES) {
    const recipe = JSON.stringify(SFX_BANK[id])
    insert.run(
      id,
      'arcade-synth-v1',
      recipe,
      hash(recipe),
      SFX_EVENTS[id],
      'packages/runtime/src/sound-bank.ts',
      'Original locally synthesized effect; no downloaded audio.',
      new Date().toISOString(),
    )
  }
  return SFX_NAMES.length
}

export interface AudioAuditGame {
  source: string
  id: string
  players: number
  codeHash: string
  updates: number
  cues: Record<string, number>
  tones: number
  invalid: string[]
  errors: string[]
  firstEvents: { frame: number; cue: string; seed: number; held: string[] }[]
  passed: boolean
}

export interface AudioAudit {
  method: string
  runtimeHash: string
  seeds: number[]
  framesPerSeed: number
  games: AudioAuditGame[]
}

/** Observed gameplay calls, never a claim that every branch or audio device was tested. */
export function recordAudioAudit(db: DatabaseSync, report: AudioAudit): number {
  db.exec('BEGIN IMMEDIATE')
  try {
    indexSoundBank(db)
    const insert = db.prepare(`INSERT INTO game_audio_checks
      (source, game_id, players, code_hash, runtime_hash, bank_hash, passed,
       observed_cues_json, tone_count, evidence_json, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, game_id, players, code_hash) DO UPDATE SET
        runtime_hash=excluded.runtime_hash, bank_hash=excluded.bank_hash,
        passed=excluded.passed, observed_cues_json=excluded.observed_cues_json,
        tone_count=excluded.tone_count, evidence_json=excluded.evidence_json,
        checked_at=excluded.checked_at`)
    for (const game of report.games) {
      const names = Object.keys(game.cues)
      const passed =
        game.passed &&
        game.updates > 0 &&
        (names.some((name) => game.cues[name]! > 0) || game.tones > 0) &&
        names.every((name) => (SFX_NAMES as readonly string[]).includes(name)) &&
        game.invalid.length === 0 &&
        game.errors.length === 0
      insert.run(
        game.source,
        game.id,
        game.players,
        game.codeHash,
        report.runtimeHash,
        SOUND_BANK_HASH,
        passed ? 1 : 0,
        JSON.stringify(game.cues),
        game.tones,
        JSON.stringify({
          method: report.method,
          seeds: report.seeds,
          framesPerSeed: report.framesPerSeed,
          updates: game.updates,
          firstEvents: game.firstEvents,
          invalid: game.invalid,
          errors: game.errors,
        }),
        new Date().toISOString(),
      )
    }
    db.exec('COMMIT')
    return report.games.length
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
