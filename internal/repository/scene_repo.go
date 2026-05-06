package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetSceneByID(db *sql.DB, id int) (*models.Scene, error) {
	row := db.QueryRow(`
		SELECT scene_id, title, content, type
		FROM scenes
		WHERE scene_id = $1
	`, id)

	var s models.Scene
	err := row.Scan(&s.SceneID, &s.Title, &s.Content, &s.Type)
	if err != nil {
		return nil, err
	}

	return &s, nil
}
