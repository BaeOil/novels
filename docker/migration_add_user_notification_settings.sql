-- Add per-user notification preferences while preserving existing users.
-- This script is idempotent and ensures a default preference row exists for every user.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user_notification_settings'
    ) THEN
        CREATE TABLE user_notification_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
            novel_update_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            follower_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            like_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            comment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            system_enabled BOOLEAN NOT NULL DEFAULT TRUE
        );
    END IF;
END $$;

INSERT INTO user_notification_settings (
    user_id,
    novel_update_enabled,
    follower_enabled,
    like_enabled,
    comment_enabled,
    system_enabled
)
SELECT
    u.user_id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
FROM users u
LEFT JOIN user_notification_settings uns
    ON uns.user_id = u.user_id
WHERE uns.user_id IS NULL;
