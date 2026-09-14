-- Enforce case-insensitive category names after duplicate verification.
-- This migration must be run outside an explicit transaction because it uses CONCURRENTLY.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_lower_unique
    ON categories (LOWER(TRIM(name)));
