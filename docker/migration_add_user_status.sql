-- Safe migration for existing PostgreSQL databases.
-- This script adds the missing user status columns without removing or changing existing data.
-- It is idempotent: rerunning it will not fail if columns already exist.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users
            ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'suspended_reason'
    ) THEN
        ALTER TABLE users
            ADD COLUMN suspended_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE users
            ADD COLUMN suspended_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_action_by_admin_id'
    ) THEN
        ALTER TABLE users
            ADD COLUMN last_action_by_admin_id INTEGER REFERENCES users(user_id);
    END IF;
END $$;
