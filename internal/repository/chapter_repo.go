package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetChaptersByNovelID(db *sql.DB, novelID int) ([]models.Chapter, error) {
	rows, err := db.Query(`
        SELECT chapter_id, novel_id, episode, title, status, created_at, updated_at
        FROM chapters
        WHERE novel_id = $1
        ORDER BY episode ASC
    `, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	chapters := []models.Chapter{}
	for rows.Next() {
		var c models.Chapter
		err := rows.Scan(&c.ChapterID, &c.NovelID, &c.Episode, &c.Title, &c.Status, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}

		scenes, err := GetScenesByChapterID(db, c.ChapterID)
		if err != nil {
			return nil, err
		}
		c.Scenes = scenes

		chapters = append(chapters, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return chapters, nil
}

func GetChapterByID(db *sql.DB, id int) (*models.Chapter, error) {
	row := db.QueryRow(`
        SELECT chapter_id, novel_id, episode, title, status, created_at, updated_at
        FROM chapters
        WHERE chapter_id = $1
    `, id)

	var c models.Chapter
	err := row.Scan(&c.ChapterID, &c.NovelID, &c.Episode, &c.Title, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return &c, nil
}

func CreateChapter(db *sql.DB, chapter models.Chapter) (int, error) {
	var id int
	err := db.QueryRow(`
        INSERT INTO chapters (novel_id, episode, title, status)
        VALUES ($1, $2, $3, $4)
        RETURNING chapter_id
    `, chapter.NovelID, chapter.Episode, chapter.Title, chapter.Status).Scan(&id)
	if err != nil {
		return 0, err
	}

	return id, nil
}

func UpdateChapter(db *sql.DB, chapter models.Chapter) error {
	_, err := db.Exec(`
        UPDATE chapters
        SET title = $1,
            status = $2,
            updated_at = NOW()
        WHERE chapter_id = $3
    `, chapter.Title, chapter.Status, chapter.ChapterID)
	return err
}

func DeleteChapter(db *sql.DB, chapterID int) error {
	_, err := db.Exec(`
        DELETE FROM chapters
        WHERE chapter_id = $1
    `, chapterID)
	return err
}

// ReorderChapters updates the episode/order of existing chapters according to
// the provided slice of chapter IDs (ordered from top to bottom). This will
// perform UPDATEs per ID and will not delete or recreate rows.
func ReorderChapters(db *sql.DB, orderedIDs []int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	for idx, id := range orderedIDs {
		// set episode starting from 1
		if _, err = tx.Exec(`UPDATE chapters SET episode = $1, updated_at = NOW() WHERE chapter_id = $2`, idx+1, id); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}
	return nil
}
