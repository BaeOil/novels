-- Standard writer-aware audit for published visibility drift.
-- This query must be used instead of the older version that only checked
-- novels.status and novels.is_published without verifying the writer row.
--
-- Rule:
-- A novel is considered valid only when:
--   - n.is_published = TRUE
--   - n.status is not in ('suspended', 'banned')
--   - w.status = 'approved'
--
-- Any row that violates these conditions should be treated as drift.

SELECT n.novel_id,
       n.title,
       n.status,
       n.is_published,
       n.author_id,
       w.writer_id,
       w.user_id,
       w.status AS writer_status
FROM novels n
LEFT JOIN writers w ON w.writer_id = n.author_id
WHERE (
    (n.status IN ('published', 'completed-published') AND n.is_published = FALSE)
    OR (n.status IN ('draft', 'completed-draft') AND n.is_published = TRUE)
    OR (n.status = 'suspended' AND n.is_published = TRUE)
    OR (n.status = 'banned' AND n.is_published = TRUE)
    OR (w.status = 'revoked' AND n.is_published = TRUE)
    OR (w.status IS NULL AND n.is_published = TRUE)
    OR (w.status = 'approved' AND n.status = 'suspended')
)
ORDER BY n.novel_id;

-- Count only the real drift rows.
SELECT COUNT(*) AS mismatched_rows
FROM novels n
LEFT JOIN writers w ON w.writer_id = n.author_id
WHERE (
    (n.status IN ('published', 'completed-published') AND n.is_published = FALSE)
    OR (n.status IN ('draft', 'completed-draft') AND n.is_published = TRUE)
    OR (n.status = 'suspended' AND n.is_published = TRUE)
    OR (n.status = 'banned' AND n.is_published = TRUE)
    OR (w.status = 'revoked' AND n.is_published = TRUE)
    OR (w.status IS NULL AND n.is_published = TRUE)
    OR (w.status = 'approved' AND n.status = 'suspended')
);
