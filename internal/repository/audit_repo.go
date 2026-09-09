package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"novel-be/internal/dto"
	"novel-be/internal/models"
)

type AuditRepository interface {
	Insert(ctx context.Context, log models.AuditLog) error
	List(ctx context.Context, filter dto.AuditLogFilter) ([]models.AuditLog, error)
	GetByID(ctx context.Context, id int64) (*models.AuditLog, error)
	Count(ctx context.Context, filter dto.AuditLogFilter) (int, error)
	GetMetadata(ctx context.Context) (dto.AuditLogMetadataResponse, error)
	EnsureIndexes(ctx context.Context) error
}

type sqlAuditRepository struct{ db *sql.DB }

func NewAuditRepository(db *sql.DB) AuditRepository { return &sqlAuditRepository{db: db} }

func (r *sqlAuditRepository) EnsureIndexes(ctx context.Context) error {
	queries := []string{
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)`,
	}
	for _, query := range queries {
		if _, err := r.db.ExecContext(ctx, query); err != nil {
			return err
		}
	}
	return nil
}

func (r *sqlAuditRepository) Insert(ctx context.Context, log models.AuditLog) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, status, ip_address, metadata)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, NULLIF($7, '')::inet, $8::jsonb)`,
		log.ActorUserID, log.ActorRole, log.Action, log.TargetType, log.TargetID, log.Status, log.IPAddress, string(log.Metadata))
	return err
}

func auditWhere(filter dto.AuditLogFilter) (string, []interface{}) {
	conditions := []string{"1=1"}
	args := make([]interface{}, 0, 7)
	add := func(condition string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(condition, len(args)))
	}
	if filter.ActorKeyword != "" {
		keyword := "%" + filter.ActorKeyword + "%"
		if filter.ActorUserID != nil {
			args = append(args, *filter.ActorUserID, keyword)
			conditions = append(conditions, fmt.Sprintf("(al.actor_user_id = $%d OR u.username ILIKE $%d)", len(args)-1, len(args)))
		} else {
			add("u.username ILIKE $%d", keyword)
		}
	} else if filter.ActorUserID != nil {
		add("al.actor_user_id = $%d", *filter.ActorUserID)
	}
	if filter.Action != "" {
		add("al.action = $%d", filter.Action)
	}
	if filter.TargetType != "" {
		add("al.target_type = $%d", filter.TargetType)
	}
	if filter.TargetID != nil {
		add("al.target_id = $%d", *filter.TargetID)
	}
	if filter.Status != "" {
		add("al.status = $%d", filter.Status)
	}
	if filter.DateFrom != nil {
		add("al.created_at >= $%d", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		add("al.created_at < $%d", *filter.DateTo)
	}
	return strings.Join(conditions, " AND "), args
}

func (r *sqlAuditRepository) List(ctx context.Context, filter dto.AuditLogFilter) ([]models.AuditLog, error) {
	where, args := auditWhere(filter)
	page, limit := filter.Page, filter.Limit
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	args = append(args, limit, (page-1)*limit)
	query := fmt.Sprintf(`
		SELECT
			al.log_id, al.actor_user_id, COALESCE(u.username, '') AS actor_username,
			al.actor_role, al.action, al.target_type, al.target_id,
			CASE al.target_type
				WHEN 'user'     THEN (SELECT username FROM users     WHERE user_id    = al.target_id)
				WHEN 'novel'    THEN (SELECT title    FROM novels    WHERE novel_id   = al.target_id)
				WHEN 'chapter'  THEN (SELECT title    FROM chapters  WHERE chapter_id = al.target_id)
				WHEN 'scene'    THEN (SELECT title    FROM scenes    WHERE scene_id   = al.target_id)
				WHEN 'category' THEN (SELECT name     FROM categories WHERE category_id = al.target_id)
				WHEN 'writer'   THEN (SELECT u2.username FROM writers w2 JOIN users u2 ON u2.user_id = w2.user_id WHERE w2.writer_id = al.target_id)
				WHEN 'report'   THEN CAST(al.target_id AS TEXT)
				ELSE NULL
			END AS target_name,
			al.status, al.ip_address, al.metadata, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON u.user_id = al.actor_user_id
		WHERE %s
		ORDER BY al.created_at DESC, al.log_id DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []models.AuditLog
	for rows.Next() {
		var item models.AuditLog
		var actor, target sql.NullInt64
		var actorUsername, targetType, targetName, ip sql.NullString
		if err := rows.Scan(
			&item.LogID, &actor, &actorUsername,
			&item.ActorRole, &item.Action, &targetType, &target,
			&targetName,
			&item.Status, &ip, &item.Metadata, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if actor.Valid {
			value := uint(actor.Int64)
			item.ActorUserID = &value
		}
		if actorUsername.Valid {
			item.ActorUsername = actorUsername.String
		}
		if target.Valid {
			value := target.Int64
			item.TargetID = &value
		}
		if targetType.Valid {
			item.TargetType = targetType.String
		}
		if targetName.Valid {
			item.TargetName = targetName.String
		}
		if ip.Valid {
			item.IPAddress = ip.String
		}
		if len(item.Metadata) == 0 {
			item.Metadata = json.RawMessage(`{}`)
		}
		logs = append(logs, item)
	}
	return logs, rows.Err()
}


func (r *sqlAuditRepository) GetByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	var item models.AuditLog
	var actor, target sql.NullInt64
	var actorUsername, targetType, targetName, ip sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT
			al.log_id, al.actor_user_id, COALESCE(u.username, '') AS actor_username,
			al.actor_role, al.action, al.target_type, al.target_id,
			CASE al.target_type
				WHEN 'user'     THEN (SELECT username FROM users     WHERE user_id    = al.target_id)
				WHEN 'novel'    THEN (SELECT title    FROM novels    WHERE novel_id   = al.target_id)
				WHEN 'chapter'  THEN (SELECT title    FROM chapters  WHERE chapter_id = al.target_id)
				WHEN 'scene'    THEN (SELECT title    FROM scenes    WHERE scene_id   = al.target_id)
				WHEN 'category' THEN (SELECT name     FROM categories WHERE category_id = al.target_id)
				WHEN 'writer'   THEN (SELECT u2.username FROM writers w2 JOIN users u2 ON u2.user_id = w2.user_id WHERE w2.writer_id = al.target_id)
				WHEN 'report'   THEN CAST(al.target_id AS TEXT)
				ELSE NULL
			END AS target_name,
			al.status, al.ip_address, al.metadata, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON u.user_id = al.actor_user_id
		WHERE al.log_id = $1`, id).Scan(
		&item.LogID, &actor, &actorUsername,
		&item.ActorRole, &item.Action, &targetType, &target,
		&targetName,
		&item.Status, &ip, &item.Metadata, &item.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if actor.Valid {
		value := uint(actor.Int64)
		item.ActorUserID = &value
	}
	if actorUsername.Valid {
		item.ActorUsername = actorUsername.String
	}
	if target.Valid {
		value := target.Int64
		item.TargetID = &value
	}
	if targetType.Valid {
		item.TargetType = targetType.String
	}
	if targetName.Valid {
		item.TargetName = targetName.String
	}
	if ip.Valid {
		item.IPAddress = ip.String
	}
	if len(item.Metadata) == 0 {
		item.Metadata = json.RawMessage(`{}`)
	}
	r.enrichMetadata(ctx, &item)
	return &item, nil
}

func getIntID(v interface{}) (int64, bool) {
	if v == nil {
		return 0, false
	}
	switch val := v.(type) {
	case float64:
		return int64(val), true
	case int64:
		return val, true
	case int:
		return int64(val), true
	case string:
		if id, err := strconv.ParseInt(val, 10, 64); err == nil {
			return id, true
		}
	}
	return 0, false
}

func (r *sqlAuditRepository) enrichMetadata(ctx context.Context, item *models.AuditLog) {
	if len(item.Metadata) == 0 {
		return
	}
	var meta map[string]interface{}
	if err := json.Unmarshal(item.Metadata, &meta); err != nil {
		return
	}

	// 1. ถ้ามี novel_id และยังไม่มี novel_title ให้ดึงชื่อนิยายจากตาราง novels
	if novelID, ok := getIntID(meta["novel_id"]); ok && meta["novel_title"] == nil {
		var title string
		if err := r.db.QueryRowContext(ctx, `SELECT title FROM novels WHERE novel_id = $1`, novelID).Scan(&title); err == nil && title != "" {
			meta["novel_title"] = title
		}
	}

	// 2. ถ้ามี chapter_id และยังไม่มี chapter_title ให้ดึงชื่อตอนจากตาราง chapters
	if chapterID, ok := getIntID(meta["chapter_id"]); ok && meta["chapter_title"] == nil {
		var title string
		var novelID int
		if err := r.db.QueryRowContext(ctx, `SELECT title, novel_id FROM chapters WHERE chapter_id = $1`, chapterID).Scan(&title, &novelID); err == nil && title != "" {
			meta["chapter_title"] = title
			if meta["novel_title"] == nil {
				var novelTitle string
				if err := r.db.QueryRowContext(ctx, `SELECT title FROM novels WHERE novel_id = $1`, novelID).Scan(&novelTitle); err == nil && novelTitle != "" {
					meta["novel_title"] = novelTitle
				}
			}
		}
	}

	// 3. ถ้าเป้าหมายคือ scene แล้วยังไม่มี novel_title หรือ chapter_title
	if item.TargetType == "scene" && item.TargetID != nil {
		var chapterTitle, novelTitle string
		query := `
			SELECT c.title, n.title
			FROM scenes s
			JOIN chapters c ON c.chapter_id = s.chapter_id
			JOIN novels n ON n.novel_id = c.novel_id
			WHERE s.scene_id = $1
		`
		if err := r.db.QueryRowContext(ctx, query, *item.TargetID).Scan(&chapterTitle, &novelTitle); err == nil {
			if meta["novel_title"] == nil && novelTitle != "" {
				meta["novel_title"] = novelTitle
			}
			if meta["chapter_title"] == nil && chapterTitle != "" {
				meta["chapter_title"] = chapterTitle
			}
		}
	}

	// 4. ถ้าเป้าหมายคือ chapter แล้วยังไม่มี novel_title
	if item.TargetType == "chapter" && item.TargetID != nil && meta["novel_title"] == nil {
		var novelTitle string
		query := `SELECT n.title FROM chapters c JOIN novels n ON n.novel_id = c.novel_id WHERE c.chapter_id = $1`
		if err := r.db.QueryRowContext(ctx, query, *item.TargetID).Scan(&novelTitle); err == nil && novelTitle != "" {
			meta["novel_title"] = novelTitle
		}
	}

	if updated, err := json.Marshal(meta); err == nil {
		item.Metadata = updated
	}
}

func (r *sqlAuditRepository) Count(ctx context.Context, filter dto.AuditLogFilter) (int, error) {
	where, args := auditWhere(filter)
	var count int
	err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON u.user_id = al.actor_user_id WHERE %s", where), args...).Scan(&count)
	return count, err
}

func (r *sqlAuditRepository) GetMetadata(ctx context.Context) (dto.AuditLogMetadataResponse, error) {
	defaultActions := []string{
		"REGISTER", "LOGIN", "LOGIN_FAILED", "LOGOUT",
		"UPDATE_PROFILE", "DELETE_ACCOUNT", "SUSPEND_USER", "UNSUSPEND_USER",
		"CHANGE_ROLE", "DELETE_USER", "APPROVE_WRITER", "REJECT_WRITER",
		"CREATE_NOVEL", "UPDATE_NOVEL", "PUBLISH_NOVEL", "UNPUBLISH_NOVEL", "DELETE_NOVEL",
		"CREATE_CHAPTER", "UPDATE_CHAPTER", "DELETE_CHAPTER",
		"CREATE_SCENE", "UPDATE_SCENE", "DELETE_SCENE",
		"CREATE_CHOICE", "UPDATE_CHOICE", "DELETE_CHOICE",
		"CREATE_CATEGORY", "UPDATE_CATEGORY", "DELETE_CATEGORY",
		"UPDATE_REPORT_STATUS",
	}
	defaultTargetTypes := []string{
		"user", "novel", "chapter", "scene", "choice", "category", "writer", "report",
	}
	defaultStatuses := []string{
		"SUCCESS", "FAILURE",
	}

	actionMap := make(map[string]bool)
	for _, a := range defaultActions {
		actionMap[a] = true
	}
	targetTypeMap := make(map[string]bool)
	for _, t := range defaultTargetTypes {
		targetTypeMap[t] = true
	}
	statusMap := make(map[string]bool)
	for _, s := range defaultStatuses {
		statusMap[s] = true
	}

	// Fetch distinct actions from database
	if rows, err := r.db.QueryContext(ctx, `SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL AND action != ''`); err == nil {
		for rows.Next() {
			var action string
			if err := rows.Scan(&action); err == nil && action != "" {
				actionMap[action] = true
			}
		}
		rows.Close()
	}

	// Fetch distinct target_types from database
	if rows, err := r.db.QueryContext(ctx, `SELECT DISTINCT target_type FROM audit_logs WHERE target_type IS NOT NULL AND target_type != ''`); err == nil {
		for rows.Next() {
			var tt string
			if err := rows.Scan(&tt); err == nil && tt != "" {
				targetTypeMap[tt] = true
			}
		}
		rows.Close()
	}

	// Fetch distinct statuses from database
	if rows, err := r.db.QueryContext(ctx, `SELECT DISTINCT status FROM audit_logs WHERE status IS NOT NULL AND status != ''`); err == nil {
		for rows.Next() {
			var st string
			if err := rows.Scan(&st); err == nil && st != "" {
				statusMap[st] = true
			}
		}
		rows.Close()
	}

	actions := make([]string, 0, len(actionMap))
	for a := range actionMap {
		actions = append(actions, a)
	}
	targetTypes := make([]string, 0, len(targetTypeMap))
	for t := range targetTypeMap {
		targetTypes = append(targetTypes, t)
	}
	statuses := make([]string, 0, len(statusMap))
	for s := range statusMap {
		statuses = append(statuses, s)
	}

	return dto.AuditLogMetadataResponse{
		Actions:     actions,
		TargetTypes: targetTypes,
		Statuses:    statuses,
	}, nil
}

