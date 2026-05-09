package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetChoicesBySceneID(db *sql.DB, sceneID int) ([]models.Choice, error) {
	rows, err := db.Query(`
        SELECT choice_id, from_scene_id, to_scene_id, label
        FROM choices
        WHERE from_scene_id = $1
        ORDER BY choice_id ASC
    `, sceneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	choices := []models.Choice{}
	for rows.Next() {
		var c models.Choice
		err := rows.Scan(&c.ChoiceID, &c.FromSceneID, &c.ToSceneID, &c.Label)
		if err != nil {
			return nil, err
		}
		choices = append(choices, c)
	}
	return choices, nil
}

func CreateChoice(db *sql.DB, choice models.Choice) (int, error) {
	var id int
	err := db.QueryRow(`
        INSERT INTO choices (from_scene_id, to_scene_id, label)
        VALUES ($1, $2, $3)
        RETURNING choice_id
    `, choice.FromSceneID, choice.ToSceneID, choice.Label).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}