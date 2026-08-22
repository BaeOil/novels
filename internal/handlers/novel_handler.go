package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

func NovelsHandler(novelService service.NovelService, writerService service.WriterService, notificationService service.NotificationService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			novels, err := novelService.ListNovels()
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			WriteJSON(w, http.StatusOK, novels)
		case http.MethodPost:
			userID, ok := middleware.GetUserIDFromContext(r.Context())
			if !ok || userID == 0 {
				WriteError(w, http.StatusUnauthorized, "unauthorized: ไม่พบข้อมูลสิทธิ์ผู้ใช้งานหรือโทเคนไม่ถูกต้อง")
				return
			}

			writer, err := writerService.GetWriterByUserID(int(userID))
			if err != nil || writer == nil {
				WriteError(w, http.StatusForbidden, "forbidden: คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
				return
			}

			var req CreateNovelRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := req.Validate(); err != nil {
				WriteError(w, http.StatusBadRequest, err.Error())
				return
			}

			resolvedStatus, isPublished, isCompleted := resolveNovelStatus(req.Status, req.IsPublished, req.IsCompleted)
			novelID, err := novelService.CreateNovel(models.Novel{
				Title:        req.Title,
				Captions:     req.Captions,
				Introduction: req.Introduction,
				CoverImage:   req.CoverImage,
				Status:       resolvedStatus,
				IsPublished:  isPublished,
				IsCompleted:  isCompleted,
				CategoryIDs:  req.CategoryIDs,
				AuthorID:     writer.WriterID,
			})
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			recordAudit(r, auditService, service.AuditEvent{Action: "CREATE_NOVEL", TargetType: "novel", TargetID: int64Pointer(novelID), Status: "SUCCESS", Metadata: map[string]interface{}{"title": req.Title, "status": resolvedStatus}})
			if isPublished {
				if err := notificationService.NotifyNewNovelPublished(novelID); err != nil {
					log.Printf("NotifyNewNovelPublished failed: %v", err)
				}
			}
			WriteJSON(w, http.StatusCreated, map[string]any{"message": "novel created", "novel_id": novelID})
		default:
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func DeleteNovelHandler(novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		novelID, err := extractNovelIDFromPath(r.URL.Path)
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			WriteError(w, http.StatusUnauthorized, "unauthorized: ไม่พบข้อมูลสิทธิ์ผู้ใช้งานหรือโทเคนไม่ถูกต้อง")
			return
		}

		writer, err := writerService.GetWriterByUserID(int(userID))
		if err != nil || writer == nil {
			WriteError(w, http.StatusForbidden, "forbidden: คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
			return
		}

		novelDetail, err := novelService.GetNovelDetail(novelID)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		novelPtr, ok := novelDetail.(*models.Novel)
		if !ok || novelPtr == nil {
			WriteError(w, http.StatusInternalServerError, "failed to load novel details")
			return
		}

		if novelPtr.AuthorID != writer.WriterID {
			WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์ลบนิยายนี้")
			return
		}

		if err := novelService.DeleteNovel(novelID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "DELETE_NOVEL", TargetType: "novel", TargetID: int64Pointer(novelID), Status: "SUCCESS", Metadata: map[string]interface{}{"title": novelPtr.Title, "status": novelPtr.Status, "author_id": novelPtr.AuthorID}})

		WriteJSON(w, http.StatusOK, map[string]string{"message": "novel deleted"})
	}
}

func UpdateNovelHandler(novelService service.NovelService, sceneService service.SceneService, writerService service.WriterService, notificationService service.NotificationService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		novelID, err := extractNovelIDFromPath(r.URL.Path)
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			WriteError(w, http.StatusUnauthorized, "unauthorized: ไม่พบข้อมูลสิทธิ์ผู้ใช้งานหรือโทเคนไม่ถูกต้อง")
			return
		}

		writer, err := writerService.GetWriterByUserID(int(userID))
		if err != nil || writer == nil {
			WriteError(w, http.StatusForbidden, "forbidden: คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
			return
		}

		novelDetail, err := novelService.GetNovelDetail(novelID)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		novelPtr, ok := novelDetail.(*models.Novel)
		if !ok || novelPtr == nil {
			WriteError(w, http.StatusInternalServerError, "failed to load novel details")
			return
		}

		if novelPtr.AuthorID != writer.WriterID {
			WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์แก้ไขนิยายนี้")
			return
		}

		var req UpdateNovelRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		title := novelPtr.Title
		captions := novelPtr.Captions
		introduction := novelPtr.Introduction
		coverImage := novelPtr.CoverImage
		categoryIDs := novelPtr.CategoryIDs

		if strings.TrimSpace(req.Title) != "" {
			title = req.Title
		}
		if req.Captions != nil {
			captions = req.Captions
		}
		if req.Introduction != nil {
			introduction = req.Introduction
		}
		if req.CoverImage != nil {
			coverImage = req.CoverImage
		}
		if len(req.CategoryIDs) > 0 {
			categoryIDs = req.CategoryIDs
		}

		// คำนวณ final state จากข้อมูลเดิมใน DB ผสมกับ Request Payload อย่างแน่ชัด
		oldIsPublished := novelPtr.IsPublished
		oldIsCompleted := novelPtr.IsCompleted

		finalIsPublished := oldIsPublished
		if req.IsPublished != nil {
			finalIsPublished = *req.IsPublished
		}

		finalIsCompleted := oldIsCompleted
		if req.IsCompleted != nil {
			finalIsCompleted = *req.IsCompleted
		}

		// ถ้าผู้ใช้ส่ง status string มา ให้ตีความประกอบกรณีไม่ได้ส่ง boolean flags มา
		if req.IsPublished == nil || req.IsCompleted == nil {
			switch strings.TrimSpace(strings.ToLower(req.Status)) {
			case "published":
				if req.IsPublished == nil {
					finalIsPublished = true
				}
			case "completed-published":
				if req.IsPublished == nil {
					finalIsPublished = true
				}
				if req.IsCompleted == nil {
					finalIsCompleted = true
				}
			case "completed-draft", "completed":
				if req.IsCompleted == nil {
					finalIsCompleted = true
				}
			case "draft":
				if req.IsPublished == nil {
					finalIsPublished = false
				}
			}
		}

		status := deriveNovelStatus(finalIsCompleted, finalIsPublished)

		log.Printf("[DEBUG UpdateNovelHandler] novelID=%d oldIsPublished=%v oldIsCompleted=%v reqStatus=%s reqIsPublished=%v reqIsCompleted=%v finalIsPublished=%v finalIsCompleted=%v finalStatus=%s",
			novelID, oldIsPublished, oldIsCompleted, req.Status, req.IsPublished, req.IsCompleted, finalIsPublished, finalIsCompleted, status)

		updatedNovel := models.Novel{
			ID:           novelID,
			Title:        title,
			Captions:     captions,
			Introduction: introduction,
			CategoryIDs:  categoryIDs,
			CoverImage:   coverImage,
			Status:       status,
			IsPublished:  finalIsPublished,
			IsCompleted:  finalIsCompleted,
		}

		var validationResult *service.PublishValidationResult

		// กรณีที่ 1: กำลัง publish novel ครั้งแรก (draft → published)
		if finalIsPublished && !oldIsPublished {
			log.Printf("[DEBUG UpdateNovelHandler] Entering Case 1: draft -> published for novelID=%d", novelID)
			val := sceneService.ValidateNovelPublishability(novelID)
			validationResult = &val
			if !val.CanPublish {
				log.Printf("[DEBUG UpdateNovelHandler] Case 1 BLOCKED for novelID=%d, issues=%+v", novelID, val.Issues)
				WriteJSON(w, http.StatusBadRequest, map[string]any{
					"error":       "ไม่สามารถเผยแพร่นิยายได้เนื่องจากมีปัญหาโครงสร้าง",
					"can_publish": false,
					"issues":      val.Issues,
				})
				return
			}
		}

		// กรณีที่ 2: final state จะเป็น published+completed → ตรวจ ending scene โดยตรงจาก StoryTree
		// ตรวจจาก FINAL STATE เพื่อป้องกันทุกกรณีที่สถานะสุดท้ายคือ is_published=true + is_completed=true
		// รวมถึงกรณีที่ novel อยู่ใน completed-published อยู่แล้ว และ frontend ส่ง payload ซ้ำ
		if finalIsPublished && finalIsCompleted {
			log.Printf("[DEBUG UpdateNovelHandler] Entering Case 2: final state published+completed for novelID=%d", novelID)
			nodes, err := sceneService.GetStoryTree(novelID, 0)
			hasEnding := false
			if err == nil {
				for _, node := range nodes.Nodes {
					if strings.EqualFold(node.Type, "ending") {
						hasEnding = true
						break
					}
				}
			}
			if !hasEnding {
				issue := service.PublishIssue{
					Severity: "blocking",
					Code:     "COMPLETED_WITHOUT_ENDING",
					Message:  "นิยายถูกตั้งค่าว่าจบแล้ว (is_completed = true) แต่ยังไม่มีฉากจบ (ending scene) ในเรื่อง กรุณาเพิ่มฉากจบอย่างน้อย 1 ฉาก",
				}
				val := service.PublishValidationResult{
					CanPublish: false,
					Issues:     []service.PublishIssue{issue},
				}
				validationResult = &val
				log.Printf("[DEBUG UpdateNovelHandler] Case 2 BLOCKED for novelID=%d: no ending scene", novelID)
				WriteJSON(w, http.StatusBadRequest, map[string]any{
					"error":       "ไม่สามารถตั้งนิยายเป็นจบได้เนื่องจากไม่มีฉากจบ",
					"can_publish": false,
					"issues":      val.Issues,
				})
				return
			}
		}

		if err := novelService.UpdateNovel(updatedNovel); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		action := novelAuditAction(oldIsPublished, finalIsPublished)
		recordAudit(r, auditService, service.AuditEvent{Action: action, TargetType: "novel", TargetID: int64Pointer(novelID), Status: "SUCCESS", Metadata: novelAuditMetadata(novelPtr, updatedNovel)})

		if updatedNovel.IsPublished && !novelPtr.IsPublished {
			if err := notificationService.NotifyNewNovelPublished(novelID); err != nil {
				log.Printf("NotifyNewNovelPublished failed: %v", err)
			}
		}

		responsePayload := map[string]any{
			"message": "novel updated",
		}
		if validationResult != nil && len(validationResult.Issues) > 0 {
			responsePayload["issues"] = validationResult.Issues
		}

		WriteJSON(w, http.StatusOK, responsePayload)
	}
}

func novelAuditAction(oldPublished, newPublished bool) string {
	if !oldPublished && newPublished {
		return "PUBLISH_NOVEL"
	}
	if oldPublished && !newPublished {
		return "UNPUBLISH_NOVEL"
	}
	return "UPDATE_NOVEL"
}

func novelAuditMetadata(oldNovel *models.Novel, newNovel models.Novel) map[string]interface{} {
	metadata := make(map[string]interface{})
	if oldNovel.Status != newNovel.Status {
		metadata["old_status"] = oldNovel.Status
		metadata["new_status"] = newNovel.Status
	}
	if oldNovel.Title != newNovel.Title {
		metadata["old_title"] = oldNovel.Title
		metadata["new_title"] = newNovel.Title
	}
	if oldNovel.IsCompleted != newNovel.IsCompleted {
		metadata["old_is_completed"] = oldNovel.IsCompleted
		metadata["new_is_completed"] = newNovel.IsCompleted
	}
	return metadata
}

// UnbanNovelHandler allows an admin to unban a novel
func UnbanNovelHandler(novelService service.NovelService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		// Ensure admin role
		role, ok := middleware.GetRoleFromContext(r.Context())
		if !ok || role != "admin" {
			WriteError(w, http.StatusForbidden, "Forbidden: admin role required")
			return
		}
		// Extract novel ID from URL path /api/admin/novels/{id}/unban
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) < 5 {
			WriteError(w, http.StatusBadRequest, "invalid path")
			return
		}
		novelID, err := strconv.Atoi(parts[3])
		if err != nil || novelID <= 0 {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}
		// Perform unban via service
		if err := novelService.UnbanNovel(r.Context(), novelID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"message": "novel unbanned"})
	}
}

func extractNovelIDFromPath(urlPath string) (int, error) {
	if strings.HasPrefix(urlPath, "/novels/") {
		return extractIDFromPath(urlPath, "/novels/")
	}
	if strings.HasPrefix(urlPath, "/api/v1/writer/novels/") {
		return extractIDFromPath(urlPath, "/api/v1/writer/novels/")
	}
	return 0, errors.New("invalid path")
}

func NovelSubRouteHandler(sceneService service.SceneService, novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		if !strings.HasSuffix(path, "/start") {
			http.NotFound(w, r)
			return
		}

		idStr := strings.TrimSuffix(path, "/start")
		id, err := strconv.Atoi(strings.Trim(idStr, "/"))
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		novelDetail, err := novelService.GetNovelDetail(id)
		if err != nil {
			WriteError(w, http.StatusNotFound, "novel not found")
			return
		}

		novelPtr, ok := novelDetail.(*models.Novel)
		if !ok || novelPtr == nil {
			WriteError(w, http.StatusInternalServerError, "failed to load novel details")
			return
		}

		isOwnerOrAdmin := false
		ctxUserID, ok := middleware.GetUserIDFromContext(r.Context())
		if ok && ctxUserID != 0 {
			if role, roleOk := middleware.GetRoleFromContext(r.Context()); roleOk && role == "admin" {
				isOwnerOrAdmin = true
			} else if writerService != nil {
				writer, wErr := writerService.GetWriterByUserID(int(ctxUserID))
				if wErr == nil && writer != nil && writer.WriterID == novelPtr.AuthorID {
					isOwnerOrAdmin = true
				}
			}
		}

		if !isOwnerOrAdmin && !novelPtr.IsPublished {
			WriteError(w, http.StatusNotFound, "novel not found")
			return
		}

		response, err := sceneService.GetStartScene(id)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, response)
	}
}
