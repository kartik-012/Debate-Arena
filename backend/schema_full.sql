-- =============================================================================
-- Debate Arena — Full Database Schema
-- SQLite with strict constraints, foreign keys, and performance indexes.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- =============================================================================
-- 1. debates
-- =============================================================================
CREATE TABLE IF NOT EXISTS debates (
    id                TEXT PRIMARY KEY,
    question          TEXT NOT NULL CHECK(length(question) <= 300),
    status            TEXT NOT NULL CHECK(status IN ('in_progress', 'judging', 'complete', 'error')),
    rounds_total      INTEGER NOT NULL DEFAULT 3 CHECK(rounds_total IN (1, 3, 5)),
    tone              TEXT NOT NULL DEFAULT 'formal' CHECK(tone IN ('formal', 'casual', 'courtroom')),
    model_for         TEXT NOT NULL DEFAULT 'claude',
    model_against     TEXT NOT NULL DEFAULT 'claude',
    model_judge       TEXT NOT NULL DEFAULT 'claude',
    winning_side      TEXT CHECK(winning_side IN ('for', 'against')),
    parent_debate_id  TEXT,
    category          TEXT,
    gemini_calls_used INTEGER NOT NULL DEFAULT 0,
    autopsy           TEXT,
    error_message     TEXT,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (parent_debate_id) REFERENCES debates(id)
);

-- =============================================================================
-- 2. debate_turns
-- =============================================================================
CREATE TABLE IF NOT EXISTS debate_turns (
    id                TEXT PRIMARY KEY,
    debate_id         TEXT NOT NULL,
    side              TEXT NOT NULL CHECK(side IN ('for', 'against')),
    round_number      INTEGER NOT NULL CHECK(round_number > 0),
    content           TEXT NOT NULL,
    strength_score    REAL CHECK(strength_score BETWEEN 0.0 AND 10.0),
    is_user_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(debate_id, side, round_number),
    FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- =============================================================================
-- 3. judge_verdicts
-- =============================================================================
CREATE TABLE IF NOT EXISTS judge_verdicts (
    id               TEXT PRIMARY KEY,
    debate_id        TEXT NOT NULL,
    winning_side     TEXT NOT NULL CHECK(winning_side IN ('for', 'against')),
    reasoning        TEXT NOT NULL,
    persona          TEXT NOT NULL DEFAULT 'single_judge',
    is_order_swapped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- =============================================================================
-- 4. fact_checks
-- =============================================================================
CREATE TABLE IF NOT EXISTS fact_checks (
    id           TEXT PRIMARY KEY,
    turn_id      TEXT NOT NULL,
    claim_text   TEXT NOT NULL,
    verdict      TEXT NOT NULL CHECK(verdict IN ('verified', 'unverified', 'false')),
    source_url   TEXT,
    explanation  TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (turn_id) REFERENCES debate_turns(id) ON DELETE CASCADE
);

-- =============================================================================
-- 5. consistency_flags
-- =============================================================================
CREATE TABLE IF NOT EXISTS consistency_flags (
    id                  TEXT PRIMARY KEY,
    turn_id             TEXT NOT NULL,
    contradicts_turn_id TEXT NOT NULL,
    explanation         TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (turn_id) REFERENCES debate_turns(id) ON DELETE CASCADE,
    FOREIGN KEY (contradicts_turn_id) REFERENCES debate_turns(id)
);

-- =============================================================================
-- 6. persona_votes
-- =============================================================================
CREATE TABLE IF NOT EXISTS persona_votes (
    id           TEXT PRIMARY KEY,
    debate_id    TEXT NOT NULL,
    persona_name TEXT NOT NULL,
    voted_side   TEXT NOT NULL CHECK(voted_side IN ('for', 'against')),
    reasoning    TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- =============================================================================
-- 7. bias_reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS bias_reports (
    id               TEXT PRIMARY KEY,
    debate_id        TEXT NOT NULL UNIQUE,
    original_winner  TEXT NOT NULL CHECK(original_winner IN ('for', 'against')),
    swapped_winner   TEXT NOT NULL CHECK(swapped_winner IN ('for', 'against')),
    bias_detected    BOOLEAN NOT NULL,
    explanation      TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_debates_status          ON debates(status);
CREATE INDEX IF NOT EXISTS idx_debates_created_at      ON debates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debates_parent          ON debates(parent_debate_id);
CREATE INDEX IF NOT EXISTS idx_turns_debate_id         ON debate_turns(debate_id);
CREATE INDEX IF NOT EXISTS idx_turns_debate_round      ON debate_turns(debate_id, round_number);
CREATE INDEX IF NOT EXISTS idx_verdicts_debate_id      ON judge_verdicts(debate_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_debate_persona ON judge_verdicts(debate_id, persona);
CREATE INDEX IF NOT EXISTS idx_factchecks_turn_id      ON fact_checks(turn_id);
CREATE INDEX IF NOT EXISTS idx_consistency_turn_id     ON consistency_flags(turn_id);
CREATE INDEX IF NOT EXISTS idx_personavotes_debate_id  ON persona_votes(debate_id);
CREATE INDEX IF NOT EXISTS idx_biasreports_debate_id   ON bias_reports(debate_id);
