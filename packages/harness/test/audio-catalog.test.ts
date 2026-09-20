import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SFX_BANK, SFX_NAMES } from '../../runtime/src/sound-bank.ts'
import { type AudioAudit, indexSoundBank, recordAudioAudit } from '../src/audio-catalog.ts'
import { indexCatalog, openCatalogDb } from '../src/catalog.ts'

function fixture(): AudioAudit {
  return {
    method: 'Fixture gameplay events; shell START excluded',
    runtimeHash: 'runtime-a',
    seeds: [7, 41],
    framesPerSeed: 1200,
    games: [
      {
        source: 'catalog',
        id: 'shooter',
        players: 1,
        codeHash: 'code-a',
        updates: 2400,
        cues: { shoot: 10, hit: 2 },
        tones: 1,
        invalid: [],
        errors: [],
        firstEvents: [{ frame: 4, cue: 'shoot', seed: 7, held: ['0:a'] }],
        passed: true,
      },
    ],
  }
}

test('SQLite recipes match the runtime bank, and indexing is idempotent', () => {
  const db = openCatalogDb(':memory:')
  try {
    indexSoundBank(db)
    indexSoundBank(db)
    const rows = db.prepare('SELECT id, recipe_json, event_hint FROM sound_effects').all()
    assert.equal(rows.length, SFX_NAMES.length)
    for (const row of rows) {
      const id = row.id as keyof typeof SFX_BANK
      assert.deepEqual(JSON.parse(String(row.recipe_json)), SFX_BANK[id])
      assert.ok(String(row.event_hint).length > 0)
      for (const note of SFX_BANK[id]) {
        assert.ok(note.ms > 0 && note.ms <= 2000)
        if (note.f !== undefined) assert.ok(note.f > 0)
        if (note.to !== undefined) assert.ok(note.to > 0)
      }
    }
    assert.equal(db.prepare('SELECT count(*) AS n FROM generated_candidates').get()?.n, 0)
  } finally {
    db.close()
  }
  // Existing catalog indexing also seeds sound assets with no games present.
  assert.deepEqual(indexCatalog([], ':memory:'), [])
})

test('audio evidence tracks exact game code and keeps different player modes separate', () => {
  const db = openCatalogDb(':memory:')
  try {
    const report = fixture()
    recordAudioAudit(db, report)
    recordAudioAudit(db, report)
    report.games[0]!.players = 2
    recordAudioAudit(db, report)
    report.games[0]!.codeHash = 'changed-game'
    recordAudioAudit(db, report)
    assert.equal(db.prepare('SELECT count(*) AS n FROM game_audio_checks').get()?.n, 3)
    const row = db
      .prepare("SELECT * FROM game_audio_checks WHERE code_hash='code-a' AND players=1")
      .get()!
    assert.equal(row.passed, 1)
    assert.deepEqual(JSON.parse(String(row.observed_cues_json)), { shoot: 10, hit: 2 })
    assert.equal(row.tone_count, 1)
    assert.equal(row.runtime_hash, 'runtime-a')
    assert.ok(String(row.bank_hash).length === 64)
    assert.match(String(row.evidence_json), /shell START excluded/)
  } finally {
    db.close()
  }
})

test('silent games, invalid cue names and execution errors cannot acquire passing evidence', () => {
  const db = openCatalogDb(':memory:')
  try {
    const report = fixture()
    const base = report.games[0]!
    report.games = [
      { ...base, id: 'silent', cues: {}, tones: 0 },
      { ...base, id: 'unknown', cues: { laser: 1 } },
      { ...base, id: 'error', errors: ['runtime failed'] },
      { ...base, id: 'no-updates', updates: 0 },
      { ...base, id: 'tone-only', cues: {}, tones: 4 },
    ]
    recordAudioAudit(db, report)
    assert.deepEqual(
      db
        .prepare('SELECT game_id FROM game_audio_checks WHERE passed=1')
        .all()
        .map((r) => r.game_id),
      ['tone-only'],
    )
  } finally {
    db.close()
  }
})
