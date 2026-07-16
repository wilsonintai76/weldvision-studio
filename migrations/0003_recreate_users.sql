-- Migration 0003: Recreate users table with auth columns
-- Apply:  wrangler d1 execute weldvision-gmaw-db --file=./migrations/0003_recreate_users.sql

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id         TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE,
    password_hash   TEXT,
    assigned_bracket_id TEXT DEFAULT NULL,
    account_status  TEXT DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Default instructor account (password: admin123)
INSERT OR IGNORE INTO users (user_id, name, email, password_hash, assigned_bracket_id, account_status, created_at)
VALUES (
    'admin-001',
    'Instructor',
    'admin@weldvision.studio',
    '4536231319108b6c07d93144c784584062a93d3a95277de9e88145d26c91278c',
    NULL,
    'active',
    datetime('now')
);
