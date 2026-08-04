DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scenes'
          AND column_name = 'node_x'
    ) THEN
        ALTER TABLE scenes
            ADD COLUMN node_x DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scenes'
          AND column_name = 'node_y'
    ) THEN
        ALTER TABLE scenes
            ADD COLUMN node_y DOUBLE PRECISION;
    END IF;
END $$;