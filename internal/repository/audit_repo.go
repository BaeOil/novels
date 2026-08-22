package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"novel-be/internal/dto"
	"novel-be/internal/models"
)

type AuditRepository interface {
	Insert(ctx context.Context, log models.AuditLog) error
	List(ctx context.Context, filter dto.AuditLogFilter) ([]models.AuditLog, error)
	GetByID(ctx context.Context, id int64) (*models.AuditLog, error)
	Count(ctx context.Context, filter dto.AuditLogFilter) (int, error)
}

type sqlAuditRepository struct{ db *sql.DB }

func NewAuditRepository(db *sql.DB) AuditRepository { return &sqlAuditRepository{db: db} }

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
	if filter.ActorUserID != nil {
		add("actor_user_id = $%d", *filter.ActorUserID)
	}
	if filter.Action != "" {
		add("action = $%d", filter.Action)
	}
	if filter.TargetType != "" {
		add("target_type = $%d", filter.TargetType)
	}
	if filter.TargetID != nil {
		add("target_id = $%d", *filter.TargetID)
	}
	if filter.Status != "" {
		add("status = $%d", filter.Status)
	}
	if filter.DateFrom != nil {
		add("created_at >= $%d", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		add("created_at < $%d", *filter.DateTo)
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
	query := fmt.Sprintf(`SELECT log_id, actor_user_id, actor_role, action, target_type, target_id, status, ip_address, metadata, created_at FROM audit_logs WHERE %s ORDER BY created_at DESC, log_id DESC LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []models.AuditLog
	for rows.Next() {
		var item models.AuditLog
		var actor, target sql.NullInt64
		var targetType, ip sql.NullString
		if err := rows.Scan(&item.LogID, &actor, &item.ActorRole, &item.Action, &targetType, &target, &item.Status, &ip, &item.Metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		if actor.Valid {
			value := uint(actor.Int64)
			item.ActorUserID = &value
		}
		if target.Valid {
			value := target.Int64
			item.TargetID = &value
		}
		if targetType.Valid {
			item.TargetType = targetType.String
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
	var targetType, ip sql.NullString
	err := r.db.QueryRowContext(ctx, `SELECT log_id, actor_user_id, actor_role, action, target_type, target_id, status, ip_address, metadata, created_at FROM audit_logs WHERE log_id = $1`, id).Scan(&item.LogID, &actor, &item.ActorRole, &item.Action, &targetType, &target, &item.Status, &ip, &item.Metadata, &item.CreatedAt)
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
	if target.Valid {
		value := target.Int64
		item.TargetID = &value
	}
	if targetType.Valid {
		item.TargetType = targetType.String
	}
	if ip.Valid {
		item.IPAddress = ip.String
	}
	if len(item.Metadata) == 0 {
		item.Metadata = json.RawMessage(`{}`)
	}
	return &item, nil
}

func (r *sqlAuditRepository) Count(ctx context.Context, filter dto.AuditLogFilter) (int, error) {
	where, args := auditWhere(filter)
	var count int
	err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM audit_logs WHERE %s", where), args...).Scan(&count)
	return count, err
}
