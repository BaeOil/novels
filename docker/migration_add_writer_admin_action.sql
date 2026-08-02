DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'writers' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE writers
            ADD COLUMN rejected_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'writers' AND column_name = 'acted_by_admin_id'
    ) THEN
        ALTER TABLE writers
            ADD COLUMN acted_by_admin_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'writers' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE writers
            ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;
