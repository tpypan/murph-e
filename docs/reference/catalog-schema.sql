-- Actual schema from data/catalog.sqlite
-- Exported read-only: 2026-09-20T01:01:59.781Z
-- No database contents or credentials included.

-- table: candidate_attempts
CREATE TABLE candidate_attempts (
      id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, run_id TEXT NOT NULL,
      stage TEXT NOT NULL, variant INTEGER NOT NULL, metadata_json TEXT NOT NULL,
      validation_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash)
    );

-- table: candidate_reviews
CREATE TABLE candidate_reviews (
    id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, attempt_id TEXT,
    verdict TEXT NOT NULL, review_json TEXT NOT NULL, review_hash TEXT NOT NULL,
    source_path TEXT NOT NULL, created_at TEXT NOT NULL,
    FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash),
    FOREIGN KEY(attempt_id) REFERENCES candidate_attempts(id)
  );

-- table: candidate_runs
CREATE TABLE candidate_runs (
      run_id TEXT NOT NULL, code_hash TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, code_hash), FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash)
    );

-- table: candidate_validation_events
CREATE TABLE candidate_validation_events (
      id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL, attempt_id TEXT,
      validation_json TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash),
      FOREIGN KEY(attempt_id) REFERENCES candidate_attempts(id)
    );

-- table: catalog_parts
CREATE TABLE catalog_parts (
      id TEXT PRIMARY KEY, version TEXT NOT NULL, content_hash TEXT NOT NULL,
      status TEXT NOT NULL, manifest_json TEXT NOT NULL, source_path TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );

-- table: game_audio_checks
CREATE TABLE game_audio_checks (
      source TEXT NOT NULL, game_id TEXT NOT NULL, players INTEGER NOT NULL,
      code_hash TEXT NOT NULL, runtime_hash TEXT NOT NULL, bank_hash TEXT NOT NULL,
      passed INTEGER NOT NULL, observed_cues_json TEXT NOT NULL, tone_count INTEGER NOT NULL,
      evidence_json TEXT NOT NULL, checked_at TEXT NOT NULL,
      PRIMARY KEY (source, game_id, players, code_hash)
    );

-- table: generated_candidates
CREATE TABLE generated_candidates (
      code_hash TEXT PRIMARY KEY, first_run_id TEXT NOT NULL, latest_run_id TEXT NOT NULL,
      title TEXT NOT NULL, genre TEXT NOT NULL, players INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'quarantined', source_path TEXT NOT NULL,
      spec_json TEXT NOT NULL, provenance_json TEXT NOT NULL, validation_json TEXT NOT NULL,
      occurrences INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );

-- table: reference_games
CREATE TABLE reference_games (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, source_url TEXT NOT NULL,
      families_json TEXT NOT NULL, metadata_json TEXT NOT NULL, verified_at TEXT NOT NULL
    );

-- table: reference_sheets
CREATE TABLE reference_sheets (
      asset_id TEXT PRIMARY KEY, game_id TEXT NOT NULL, title TEXT NOT NULL,
      kind TEXT NOT NULL, source_url TEXT NOT NULL, status TEXT NOT NULL,
      runtime_ready INTEGER NOT NULL CHECK(runtime_ready=0), metadata_json TEXT NOT NULL,
      FOREIGN KEY(game_id) REFERENCES reference_games(id)
    );

-- table: sound_effects
CREATE TABLE sound_effects (
      id TEXT PRIMARY KEY, format TEXT NOT NULL, recipe_json TEXT NOT NULL,
      content_hash TEXT NOT NULL, event_hint TEXT NOT NULL,
      source_path TEXT NOT NULL, provenance TEXT NOT NULL, indexed_at TEXT NOT NULL
    );

-- table: sprite_sets
CREATE TABLE sprite_sets (
      id TEXT PRIMARY KEY, pack_id TEXT NOT NULL, content_hash TEXT NOT NULL,
      status TEXT NOT NULL, source_path TEXT NOT NULL, metadata_json TEXT NOT NULL
    );

-- index: attempts_code
CREATE INDEX attempts_code ON candidate_attempts(code_hash, run_id);

-- index: audio_checks_code
CREATE INDEX audio_checks_code ON game_audio_checks(code_hash);

-- index: candidates_genre
CREATE INDEX candidates_genre ON generated_candidates(genre, players, status);

-- index: reference_kind
CREATE INDEX reference_kind ON reference_sheets(kind, status);

-- index: reviews_candidate
CREATE INDEX reviews_candidate ON candidate_reviews(code_hash, created_at);

-- Offline saved-game component inventory; admission remains in catalog_parts.
CREATE TABLE component_blobs (code_hash TEXT PRIMARY KEY, source TEXT NOT NULL);

CREATE TABLE component_origins (
      source_path TEXT NOT NULL, code_hash TEXT NOT NULL, metadata_json TEXT NOT NULL,
      current INTEGER NOT NULL, PRIMARY KEY(source_path,code_hash));

CREATE TABLE component_sources (
      code_hash TEXT PRIMARY KEY, version INTEGER NOT NULL, source_file TEXT NOT NULL,
      errors_json TEXT NOT NULL, indexed_at TEXT NOT NULL);

CREATE TABLE game_components (
      id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      start_line INTEGER NOT NULL, end_line INTEGER NOT NULL, code_hash TEXT NOT NULL,
      dependencies_json TEXT NOT NULL, blockers_json TEXT NOT NULL, top_level INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status='needs-review'), start_offset INTEGER NOT NULL DEFAULT 0);

CREATE INDEX component_names ON game_components(name,kind);

CREATE INDEX component_origin_hash ON component_origins(code_hash);

CREATE INDEX component_source ON game_components(source_hash);
