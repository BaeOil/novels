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

func CreateSceneHandler(sceneService service.SceneService, notificationService service.NotificationService) http.HandlerFunc {
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

		if err := notificationService.NotifySceneUpdated(req.NovelID, sceneID); err != nil {
			log.Printf("NotifySceneUpdated failed: %v", err)
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "scene created", "scene_id": sceneID})
	}
}

func UpdateSceneHandler(sceneService service.SceneService, notificationService service.NotificationService) http.HandlerFunc {
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

		if err := sceneService.UpdateScene(scene); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := notificationService.NotifySceneUpdated(scene.NovelID, sceneID); err != nil {
			log.Printf("NotifySceneUpdated failed: %v", err)
		}

		if req.Choices != nil {
			if err := sceneService.SyncSceneChoices(sceneID, req.Choices); err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}

		WriteJSON(w, http.StatusOK, map[string]any{"message": "scene updated"})
	}
}

func DeleteSceneHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := extractIDFromPath(r.URL.Path, "/scenes/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id parameter")
			return
		}

		if err := sceneService.DeleteScene(sceneID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]any{"message": "scene deleted"})
	}
}

// ... GetSceneHandler คงเดิม ...
func GetSceneHandler(sceneService service.SceneService) http.HandlerFunc {
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

		WriteJSON(w, http.StatusOK, scene)
	}
}
