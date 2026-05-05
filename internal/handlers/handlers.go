package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"novel-be/internal/models" // แก้ชื่อตาม go.mod
)

func GetNovels(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		rows, err := db.Query("SELECT novel_id, title, introduction FROM novels")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		novels := []models.Novel{}
		for rows.Next() {
			var n models.Novel
			if err := rows.Scan(&n.ID, &n.Title, &n.Introduction); err != nil {
				continue
			}
			novels = append(novels, n)
		}
		json.NewEncoder(w).Encode(novels)
	}
}

func GetScene(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		sceneID := r.URL.Query().Get("id")
		if sceneID == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		var s models.SceneResponse
		err := db.QueryRow("SELECT scene_id, content, type FROM scenes WHERE scene_id = $1", sceneID).
			Scan(&s.SceneID, &s.Content, &s.Type)

		if err != nil {
			http.Error(w, "ไม่พบฉากนี้", http.StatusNotFound)
			return
		}

		s.Choices = []models.Choice{}
		rows, _ := db.Query("SELECT choice_id, label, to_scene_id FROM choices WHERE from_scene_id = $1", sceneID)
		defer rows.Close()

		for rows.Next() {
			var c models.Choice
			rows.Scan(&c.ChoiceID, &c.Label, &c.ToSceneID)
			s.Choices = append(s.Choices, c)
		}
		json.NewEncoder(w).Encode(s)
	}
}

func HealthCheck(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := db.Ping(); err != nil {
			w.WriteHeader(503)
			json.NewEncoder(w).Encode(map[string]string{"status": "down"})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "up"})
	}
}
