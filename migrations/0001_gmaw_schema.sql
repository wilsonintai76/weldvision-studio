-- Migration 0001: GMAW Core Schema
-- WeldVision Studio — Cloudflare D1
--
-- Apply:  wrangler d1 execute weldvision-gmaw-db --file=./migrations/0001_gmaw_schema.sql
-- Status: wrangler d1 execute weldvision-gmaw-db --command="SELECT name FROM sqlite_master WHERE type='table'"

-- ── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    user_id         TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    assigned_bracket_id TEXT DEFAULT NULL,
    account_status  TEXT DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Bracket Calibration ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bracket_calibration (
    bracket_id      TEXT PRIMARY KEY,
    focal_length_px REAL NOT NULL,
    tip_offset_x_mm REAL NOT NULL,
    tip_offset_y_mm REAL NOT NULL,
    tip_offset_z_mm REAL NOT NULL,
    updated_at      TEXT NOT NULL
);

-- ── GMAW Sessions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmaw_sessions (
    session_id          TEXT PRIMARY KEY,
    student_id          TEXT NOT NULL,
    bracket_id          TEXT NOT NULL,

    -- Dedicated GMAW Parameters
    configured_voltage  REAL NOT NULL,
    configured_wfs_ipm  REAL NOT NULL,
    resolved_avg_amperage REAL NOT NULL,
    calculated_heat_input REAL NOT NULL,

    -- Scoring Profiles
    spatial_score       INTEGER NOT NULL,   -- Evaluates how steady the z_gap was
    speed_score         INTEGER NOT NULL,   -- Evaluates consistency of travel speed
    final_grade         INTEGER DEFAULT NULL, -- Assigned by Instructor override
    r2_json_key         TEXT NOT NULL,       -- Maps to dense 60 Hz JSON archive in R2

    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (bracket_id) REFERENCES bracket_calibration(bracket_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gmaw_sessions_student
    ON gmaw_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_gmaw_sessions_bracket
    ON gmaw_sessions(bracket_id);

CREATE INDEX IF NOT EXISTS idx_pending_gmaw_reviews
    ON gmaw_sessions(final_grade)
    WHERE final_grade IS NULL;

CREATE INDEX IF NOT EXISTS idx_gmaw_sessions_created
    ON gmaw_sessions(created_at);
