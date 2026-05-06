package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func GetNovels(db *sql.DB) ([]models.Novel, error) {
	rows, err := db.Query(`
        SELECT 
            n.novel_id, n.title, n.captions, n.introduction, n.cover_image, n.status,
            n.author_id, n.views, n.created_at, n.updated_at,
            w.name_lastname, w.pen_name
        FROM novels n
        LEFT JOIN writers w ON n.author_id = w.writer_id
        ORDER BY n.created_at DESC
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	novels := []models.Novel{}
	for rows.Next() {
		var n models.Novel
		var authorName, penName *string
		err := rows.Scan(
			&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status,
			&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
			&authorName, &penName,
		)
		if err != nil {
			return nil, err
		}
		if authorName != nil {
			n.AuthorName = *authorName
		}
		if penName != nil {
			n.PenName = *penName
		}
		novels = append(novels, n)
	}
	return novels, nil
}
