package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetReadingProgress(db *sql.DB, userID, novelID int) (*models.ReadingProgress, error) {
	row := db.QueryRow(`
        SELECT progress_id, user_id, novel_id, current_scene_id, updated_at
        FROM reading_progress
        WHERE user_id = $1 AND novel_id = $2
    `, userID, novelID)

	var progress models.ReadingProgress
	err := row.Scan(&progress.ProgressID, &progress.UserID, &progress.NovelID, &progress.CurrentSceneID, &progress.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &progress, nil
}

func SaveReadingProgress(db *sql.DB, progress models.ReadingProgress) error {
	result, err := db.Exec(`
        UPDATE reading_progress
        SET current_scene_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND novel_id = $3
    `, progress.CurrentSceneID, progress.UserID, progress.NovelID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		_, err = db.Exec(`
            INSERT INTO reading_progress (user_id, novel_id, current_scene_id)
            VALUES ($1, $2, $3)
        `, progress.UserID, progress.NovelID, progress.CurrentSceneID)
	}
	return err
}

func InsertChoiceHistory(db *sql.DB, history models.ChoiceHistory) error {
	_, err := db.Exec(`
        INSERT INTO user_choice_history (user_id, choice_id)
        VALUES ($1, $2)
    `, history.UserID, history.ChoiceID)
	return err
}
