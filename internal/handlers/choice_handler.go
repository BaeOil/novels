package handlers

import (
	"encoding/json"
	"net/http"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func CreateChoiceHandler(sceneService service.SceneService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req CreateChoiceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		fromScene, err := sceneService.GetScene(req.FromSceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "source scene not found")
			return
		}
		chapter, err := chapterService.GetChapterByID(fromScene.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != fromScene.NovelID {
			WriteError(w, http.StatusNotFound, "source scene not found")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, fromScene.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		choiceID, err := sceneService.CreateChoice(models.Choice{
			FromSceneID: req.FromSceneID,
			ToSceneID:   req.ToSceneID,
			Label:       req.Label,
		})
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "CREATE_CHOICE", TargetType: "choice", TargetID: int64Pointer(choiceID), Status: "SUCCESS", Metadata: map[string]interface{}{"from_scene_id": req.FromSceneID, "to_scene_id": req.ToSceneID}})

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "choice created", "choice_id": choiceID})
	}
}

func UpdateChoiceHandler(sceneService service.SceneService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		choiceID, err := extractIDFromPath(r.URL.Path, "/choices/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid choice id")
			return
		}
		existingChoice, err := sceneService.GetChoiceByID(choiceID)
		if err != nil || existingChoice == nil {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		fromScene, err := sceneService.GetScene(existingChoice.FromSceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		chapter, err := chapterService.GetChapterByID(fromScene.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != fromScene.NovelID {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, fromScene.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		var req UpdateChoiceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		choice := models.Choice{
			ChoiceID:  choiceID,
			ToSceneID: req.ToSceneID,
			Label:     req.Label,
		}

		if err := sceneService.UpdateChoice(choice); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "UPDATE_CHOICE", TargetType: "choice", TargetID: int64Pointer(choiceID), Status: "SUCCESS", Metadata: map[string]interface{}{"from_scene_id": existingChoice.FromSceneID, "to_scene_id": req.ToSceneID}})

		WriteJSON(w, http.StatusOK, map[string]any{"message": "choice updated"})
	}
}

func DeleteChoiceHandler(sceneService service.SceneService, chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService, auditService service.AuditService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		choiceID, err := extractIDFromPath(r.URL.Path, "/choices/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid choice id")
			return
		}
		existingChoice, err := sceneService.GetChoiceByID(choiceID)
		if err != nil || existingChoice == nil {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		fromScene, err := sceneService.GetScene(existingChoice.FromSceneID)
		if err != nil {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		chapter, err := chapterService.GetChapterByID(fromScene.ChapterID)
		if err != nil || chapter == nil || chapter.NovelID != fromScene.NovelID {
			WriteError(w, http.StatusNotFound, "choice not found")
			return
		}
		if err := requireWriterOwnsNovel(r.Context(), writerService, novelService, fromScene.NovelID); err != nil {
			if writeOwnershipError(w, err) {
				return
			}
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if err := sceneService.DeleteChoice(choiceID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		recordAudit(r, auditService, service.AuditEvent{Action: "DELETE_CHOICE", TargetType: "choice", TargetID: int64Pointer(choiceID), Status: "SUCCESS", Metadata: map[string]interface{}{"from_scene_id": existingChoice.FromSceneID, "to_scene_id": existingChoice.ToSceneID}})

		WriteJSON(w, http.StatusOK, map[string]any{"message": "choice deleted"})
	}
}
