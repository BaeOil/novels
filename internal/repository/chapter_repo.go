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
		chapters = append(chapters, c)
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
