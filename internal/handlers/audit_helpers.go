package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"

	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

var (
	errOwnershipUnauthorized = errors.New("unauthorized")
	errOwnershipForbidden    = errors.New("forbidden")
)

func recordAudit(r *http.Request, audit service.AuditService, event service.AuditEvent) {
	if audit == nil {
		return
	}
	event.IPAddress = r.RemoteAddr
	if err := audit.Record(r.Context(), event); err != nil {
		log.Printf("audit log write failed: action=%s target_type=%s target_id=%v error=%v", event.Action, event.TargetType, event.TargetID, err)
	}
}

func recordAuditWithBackendActor(r *http.Request, audit service.AuditService, actorUserID *uint, actorRole string, event service.AuditEvent) {
	if audit == nil {
		return
	}
	event.IPAddress = r.RemoteAddr
	if err := service.RecordWithBackendActor(audit, r.Context(), actorUserID, actorRole, event); err != nil {
		log.Printf("audit log write failed: action=%s target_type=%s target_id=%v error=%v", event.Action, event.TargetType, event.TargetID, err)
	}
}

func int64Pointer(value int) *int64 { converted := int64(value); return &converted }

func requireWriterOwnsNovel(ctx context.Context, writerService service.WriterService, novelService service.NovelService, novelID int) error {
	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok || userID == 0 {
		return errOwnershipUnauthorized
	}

	writer, err := writerService.GetWriterByUserID(int(userID))
	if err != nil || writer == nil {
		return errOwnershipForbidden
	}

	novelDetail, err := novelService.GetNovelDetail(novelID)
	if err != nil {
		return fmt.Errorf("load novel ownership: %w", err)
	}
	novel, ok := novelDetail.(*models.Novel)
	if !ok || novel == nil {
		return errors.New("failed to load novel details")
	}
	if novel.AuthorID != writer.WriterID {
		return errOwnershipForbidden
	}
	return nil
}

func writeOwnershipError(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, errOwnershipUnauthorized):
		WriteError(w, http.StatusUnauthorized, "unauthorized")
	case errors.Is(err, errOwnershipForbidden):
		WriteError(w, http.StatusForbidden, "forbidden")
	default:
		return false
	}
	return true
}
