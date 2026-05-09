package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/service"
)

// --------------------
// Health
// --------------------
func HealthCheck(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := sceneService.Ping(); err != nil {
			WriteError(w, http.StatusServiceUnavailable, "service unavailable")
			return
		}

		WriteJSON(w, http.StatusOK, map[string]string{"status": "up"})
	}
}

// --------------------
// Root
// --------------------
func GetRoot(flow service.FlowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"message": flow.GetWelcome()})
	}
}

// --------------------
// GET /reader/scenes/{id}
// --------------------
func GetSceneHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/reader/scenes/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid id")
			return
		}

		result, err := sceneService.GetScene(id)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, result)
	}
}
