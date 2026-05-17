package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

// ======= Reading Repository Methods =======

func (r *postgresReadingRepository) GetReadingProgress(userID, novelID int) (*models.ReadingProgress, error) {
	row := r.db.QueryRow(`
		SELECT progress_id, user_id, novel_id, current_scene_id, updated_at
		FROM reading_progress
		WHERE user_id = $1 AND novel_id = $2
	`, userID, novelID)

	var progress models.ReadingProgress

	err := row.Scan(
		&progress.ProgressID,
		&progress.UserID,
		&progress.NovelID,
		&progress.CurrentSceneID,
		&progress.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &progress, nil
}

func (r *postgresReadingRepository) SaveReadingProgress(userID, novelID, sceneID int) error {
	query := `
		INSERT INTO reading_progress (
			user_id,
			novel_id,
			current_scene_id,
			updated_at
		)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)

		ON CONFLICT (user_id, novel_id)
		DO UPDATE SET
			current_scene_id = EXCLUDED.current_scene_id,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := r.db.Exec(query, userID, novelID, sceneID)
	return err
}

func (r *postgresReadingRepository) InsertSceneHistory(userID int, sceneID int) error {
	query := `
		INSERT INTO user_scene_history (user_id, scene_id, visited_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, scene_id) DO NOTHING
	`

	_, err := r.db.Exec(query, userID, sceneID)
	return err
}

func (r *postgresReadingRepository) InsertChoiceHistory(history models.ChoiceHistory) error {
	query := `
		INSERT INTO user_choice_history (
			user_id,
			choice_id
		)
		VALUES ($1, $2)
	`

	_, err := r.db.Exec(query, history.UserID, history.ChoiceID)

	return err
}
