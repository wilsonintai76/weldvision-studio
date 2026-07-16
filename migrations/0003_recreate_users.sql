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
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    NULL,
    'active',
    datetime('now')
);
