package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
	"strings"
)

func toPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func UpdateScenePositionHandler(sceneService service.SceneService, novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := extractIDFromPath(r.URL.Path, "/scenes/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id parameter")
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

		existingScene, err := sceneService.GetScene(sceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}

		novelDetail, err := novelService.GetNovelDetail(existingScene.NovelID)
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
			WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์แก้ไขตำแหน่งนิยายเรื่องนี้")
			return
		}

		var req UpdateScenePositionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := sceneService.UpdateScenePosition(sceneID, req.NodeX, req.NodeY); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				WriteError(w, http.StatusNotFound, "scene not found")
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{
			"message":  "scene position updated",
			"scene_id": sceneID,
			"node_x":   req.NodeX,
			"node_y":   req.NodeY,
		})
	}
}

func CreateSceneHandler(sceneService service.SceneService, notificationService service.NotificationService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreateSceneRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		chapter, err := chapterService.GetChapterByID(req.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != req.NovelID {
			WriteError(w, http.StatusBadRequest, "chapter does not belong to novel")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, chapter.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// ✅ แก้จุดแดง image_48c32e โดยใช้ strPtr() หุ้มค่าที่เป็น string
		sceneID, err := sceneService.CreateScene(models.Scene{
			NovelID:           req.NovelID,
			ChapterID:         req.ChapterID,
			Title:             req.Title,
			Content:           req.Content,
			ImageURL:          req.ImageURL,
			Type:              req.Type,
			Status:            req.Status,
			EndingTitle:       toPtr(req.EndingTitle),
			EndingType:        toPtr(req.EndingType),
			EndingDescription: toPtr(req.EndingDescription),
		})

		if err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if req.Choices != nil {
			if err := sceneService.SyncSceneChoices(sceneID, req.Choices); err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}

		if err := notificationService.NotifySceneUpdated(req.NovelID, sceneID); err != nil {
			log.Printf("NotifySceneUpdated failed: %v", err)
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "CREATE_SCENE", TargetType: "scene", TargetID: int64Pointer(sceneID), Status: "SUCCESS", Metadata: map[string]interface{}{"novel_id": req.NovelID, "chapter_id": req.ChapterID}})

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "scene created", "scene_id": sceneID})
	}
}

func UpdateSceneHandler(sceneService service.SceneService, notificationService service.NotificationService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := extractIDFromPath(r.URL.Path, "/scenes/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id parameter")
			return
		}

		existingScene, err := sceneService.GetScene(sceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}
		chapter, err := chapterService.GetChapterByID(existingScene.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != existingScene.NovelID {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, existingScene.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		var req UpdateSceneRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		scene := models.Scene{
			SceneID:           sceneID,
			NovelID:           existingScene.NovelID,
			ChapterID:         existingScene.ChapterID,
			Title:             req.Title,
			Content:           req.Content,
			Type:              req.Type,
			Status:            req.Status,
			EndingTitle:       toPtr(req.EndingTitle),
			EndingType:        toPtr(req.EndingType),
			EndingDescription: toPtr(req.EndingDescription),
		}

		if req.IsEnding {
			scene.Type = "ending"
		}

		var validationResult *service.PublishValidationResult
		isPublishing := !strings.EqualFold(existingScene.Status, "published") && strings.EqualFold(req.Status, "published")
		if isPublishing {
			val := sceneService.ValidateNovelPublishability(existingScene.NovelID)
			validationResult = &val
			if !val.CanPublish {
				WriteJSON(w, http.StatusBadRequest, map[string]any{
					"error":       "ไม่สามารถเผยแพร่ฉากได้เนื่องจากมีปัญหาโครงสร้างนิยาย",
					"can_publish": false,
					"issues":      val.Issues,
				})
				return
			}
		}

		if err := sceneService.UpdateScene(scene); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := notificationService.NotifySceneUpdated(scene.NovelID, sceneID); err != nil {
			log.Printf("NotifySceneUpdated failed: %v", err)
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if req.Choices != nil {
			if err := sceneService.SyncSceneChoices(sceneID, req.Choices); err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "UPDATE_SCENE", TargetType: "scene", TargetID: int64Pointer(sceneID), Status: "SUCCESS", Metadata: map[string]interface{}{"novel_id": scene.NovelID, "chapter_id": scene.ChapterID}})

		responsePayload := map[string]any{
			"message": "scene updated",
		}
		if validationResult != nil && len(validationResult.Issues) > 0 {
			responsePayload["issues"] = validationResult.Issues
		}

		WriteJSON(w, http.StatusOK, responsePayload)
	}
}

func DeleteSceneHandler(sceneService service.SceneService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := extractIDFromPath(r.URL.Path, "/scenes/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id parameter")
			return
		}
		existingScene, err := sceneService.GetScene(sceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}
		chapter, err := chapterService.GetChapterByID(existingScene.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != existingScene.NovelID {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, existingScene.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if err := sceneService.DeleteScene(sceneID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "DELETE_SCENE", TargetType: "scene", TargetID: int64Pointer(sceneID), Status: "SUCCESS", Metadata: map[string]interface{}{"novel_id": existingScene.NovelID, "chapter_id": existingScene.ChapterID}})

		WriteJSON(w, http.StatusOK, map[string]any{"message": "scene deleted"})
	}
}

// ... GetSceneHandler คงเดิม ...
func GetSceneHandler(sceneService service.SceneService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := extractIDFromPath(r.URL.Path, "/scenes/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id parameter")
			return
		}

		scene, err := sceneService.GetScene(sceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}

		// ดึง chapter เพื่อตรวจสอบ status
		chapter, err := chapterService.GetChapterByID(scene.ChapterID)
		if err != nil || chapter == nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}

		// ดึง novel เพื่อตรวจสอบ is_published
		novelDetail, err := novelService.GetNovelDetail(scene.NovelID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "scene not found")
			return
		}
		novelPtr, ok := novelDetail.(*models.Novel)
		if !ok || novelPtr == nil {
			WriteError(w, http.StatusInternalServerError, "failed to load novel details")
			return
		}

		isOwnerOrAdmin := false
		var currentWriterID int
		var ctxRole string
		ctxUserID, ok := middleware.GetUserIDFromContext(r.Context())
		if ok && ctxUserID != 0 {
			if role, roleOk := middleware.GetRoleFromContext(r.Context()); roleOk && role == "admin" {
				isOwnerOrAdmin = true
				ctxRole = role
			} else if writerService != nil {
				writer, wErr := writerService.GetWriterByUserID(int(ctxUserID))
				if wErr == nil && writer != nil {
					currentWriterID = writer.WriterID
					if writer.WriterID == novelPtr.AuthorID {
						isOwnerOrAdmin = true
					}
				}
			}
		}

		log.Printf("[DEBUG GetSceneHandler] sceneID=%d sceneStatus=%s chapterID=%d chapterStatus=%s novelID=%d novelAuthorID=%d userID=%d writerID=%d role=%s isOwnerOrAdmin=%v novelIsPublished=%v",
			sceneID, scene.Status, scene.ChapterID, chapter.Status, scene.NovelID, novelPtr.AuthorID, ctxUserID, currentWriterID, ctxRole, isOwnerOrAdmin, novelPtr.IsPublished)

		if !isOwnerOrAdmin {
			// ตรวจ 3 ระดับ: novel published + chapter published + scene published
			if !novelPtr.IsPublished || chapter.Status != "published" || scene.Status != "published" {
				log.Printf("[DEBUG GetSceneHandler REJECT 404] sceneID=%d isOwnerOrAdmin=false novelIsPublished=%v chapterStatus=%s sceneStatus=%s",
					sceneID, novelPtr.IsPublished, chapter.Status, scene.Status)
				WriteError(w, http.StatusNotFound, "scene not found")
				return
			}
		}

		WriteJSON(w, http.StatusOK, scene)
	}
}
