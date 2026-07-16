-- Migration 0002: Auth Columns
-- WeldVision Studio — Cloudflare D1
--
-- Apply:  wrangler d1 execute weldvision-gmaw-db --file=./migrations/0002_auth_columns.sql

-- Add authentication columns to users table (UNIQUE handled in app logic)
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Create index for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert a default instructor account (password: admin123)
-- Hash is SHA-256 of "admin123:weldvision-salt"
INSERT OR IGNORE INTO users (user_id, name, email, password_hash, account_status)
VALUES (
    'admin-001',
    'Instructor',
    'admin@weldvision.studio',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    'active'
);
