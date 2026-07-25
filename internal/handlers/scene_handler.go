package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

func toPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
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
