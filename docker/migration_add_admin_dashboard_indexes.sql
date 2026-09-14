-- Dashboard query indexes. Run this migration outside an explicit transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status_pending
    ON reports (status, created_at DESC)
    WHERE status IN ('pending', 'appeal_pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_writers_status_pending
    ON writers (status, applied_at DESC)
    WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
    ON users (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_novels_created_at
    ON novels (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_writers_user_id
    ON writers (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_novels_author_id
    ON novels (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_novel_id
    ON reports (novel_id);
