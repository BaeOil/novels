ALTER TABLE reports
  ADD COLUMN report_type VARCHAR(20) NOT NULL DEFAULT 'report';

ALTER TABLE reports
  ADD CONSTRAINT chk_reports_report_type
  CHECK (report_type IN ('report', 'appeal'));

UPDATE reports
SET report_type = 'appeal'
WHERE reason LIKE '[ขอปลดแบน]:%';

CREATE INDEX idx_reports_type_status_created
  ON reports (report_type, status, created_at DESC);
