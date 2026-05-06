package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetChoicesBySceneID(db *sql.DB, sceneID int) ([]models.Choice, error) {
	rows, err := db.Query(`
		SELECT choice_id, label, to_scene_id
		FROM choices
		WHERE from_scene_id = $1
	`, sceneID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var choices []models.Choice

	for rows.Next() {
		var c models.Choice
		err := rows.Scan(&c.ChoiceID, &c.Label, &c.ToSceneID)
		if err != nil {
			continue
		}
		choices = append(choices, c)
	}

	return choices, nil
}
