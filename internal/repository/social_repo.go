package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

func AddLike(db *sql.DB, like models.Like) error {
	_, err := db.Exec(`
        INSERT INTO likes (user_id, novel_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, novel_id) DO NOTHING
    `, like.UserID, like.NovelID)
	return err
}

func AddComment(db *sql.DB, comment models.Comment) (int, error) {
	var id int
	err := db.QueryRow(`
        INSERT INTO comments (user_id, novel_id, scene_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING comment_id
    `, comment.UserID, comment.NovelID, comment.SceneID, comment.Content).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func AddFollow(db *sql.DB, follow models.Follow) error {
	_, err := db.Exec(`
        INSERT INTO follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT (follower_id, following_id) DO NOTHING
    `, follow.FollowerID, follow.FollowingID)
	return err
}

func GetCommentsByNovelID(db *sql.DB, novelID int) ([]models.Comment, error) {
	rows, err := db.Query(`
        SELECT c.comment_id, c.user_id, c.novel_id, c.scene_id, c.content, c.created_at, u.username
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE c.novel_id = $1
        ORDER BY c.created_at DESC
    `, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		var c models.Comment
		err := rows.Scan(&c.CommentID, &c.UserID, &c.NovelID, &c.SceneID, &c.Content, &c.CreatedAt, &c.Username)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}

func GetCommentsBySceneID(db *sql.DB, sceneID int) ([]models.Comment, error) {
	rows, err := db.Query(`
        SELECT c.comment_id, c.user_id, c.novel_id, c.scene_id, c.content, c.created_at, u.username
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE c.scene_id = $1
        ORDER BY c.created_at DESC
    `, sceneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		var c models.Comment
		err := rows.Scan(&c.CommentID, &c.UserID, &c.NovelID, &c.SceneID, &c.Content, &c.CreatedAt, &c.Username)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}
