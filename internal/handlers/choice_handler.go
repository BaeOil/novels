package handlers

import (
	"encoding/json"
	"net/http"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func CreateChoiceHandler(sceneService service.SceneService) http.HandlerFunc {
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

		choiceID, err := sceneService.CreateChoice(models.Choice{
			FromSceneID: req.FromSceneID,
			ToSceneID:   req.ToSceneID,
			Label:       req.Label,
		})
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "choice created", "choice_id": choiceID})
	}
}
