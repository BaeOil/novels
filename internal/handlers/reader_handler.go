package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/service"
)

// --------------------
// Health
// --------------------
func HealthCheck(sceneService *service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Content-Type", "application/json")

		if err := sceneService.DB.Ping(); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"status": "down"})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "up"})
	}
}

// --------------------
// Root
// --------------------
func GetRoot(flow *service.FlowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": flow.GetWelcome(),
		})
	}
}

// --------------------
// GET /reader/scenes/{id}
// --------------------
func GetSceneHandler(sceneService *service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		idStr := strings.TrimPrefix(r.URL.Path, "/reader/scenes/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", 400)
			return
		}

		result, err := sceneService.GetScene(id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
