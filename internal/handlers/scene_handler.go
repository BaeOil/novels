package handlers

import (
	"encoding/json"
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

func CreateSceneHandler(sceneService service.SceneService) http.HandlerFunc {
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
			EndingTitle:       toPtr(req.EndingTitle),
			EndingType:        toPtr(req.EndingType),
			EndingDescription: toPtr(req.EndingDescription),
		})

		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "scene created", "scene_id": sceneID})
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
