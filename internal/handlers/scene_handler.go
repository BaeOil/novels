package handlers

import (
    "encoding/json"
    "net/http"
    "novel-be/internal/service"
    "strconv"
)

func GetScene(service *service.SceneService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Access-Control-Allow-Origin", "*")

        sceneIDStr := r.URL.Query().Get("id")
        if sceneIDStr == "" {
            http.Error(w, "Missing id parameter", http.StatusBadRequest)
            return
        }

        sceneID, err := strconv.Atoi(sceneIDStr)
        if err != nil {
            http.Error(w, "Invalid id parameter", http.StatusBadRequest)
            return
        }

        scene, err := service.GetScene(sceneID)
        if err != nil {
            http.Error(w, "ไม่พบฉากนี้", http.StatusNotFound)
            return
        }

        json.NewEncoder(w).Encode(scene)
    }
}
