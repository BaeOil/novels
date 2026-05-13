package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

// GetSceneByID ดึงข้อมูลฉากจาก ID
func GetSceneByID(db *sql.DB, id int) (*models.Scene, error) {
	row := db.QueryRow(`
		SELECT scene_id, chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description
		FROM scenes
		WHERE scene_id = $1
	`, id)

	var s models.Scene
	err := row.Scan(&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.Type, &s.EndingTitle, &s.EndingType, &s.EndingDescription)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

// GetStartSceneByNovelID หาจุดเริ่มต้นของนิยาย (มีเพียงหนึ่งเดียวต่อเรื่อง)
func GetStartSceneByNovelID(db *sql.DB, novelID int) (*models.Scene, error) {
	row := db.QueryRow(`
		SELECT scene_id, chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description
		FROM scenes
		WHERE novel_id = $1 AND type = 'start'
		LIMIT 1
	`, novelID)

	var s models.Scene
	err := row.Scan(&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.Type, &s.EndingTitle, &s.EndingType, &s.EndingDescription)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

// GetScenesByChapterID ดึงฉากทั้งหมดในตอนนั้นๆ
func GetScenesByChapterID(db *sql.DB, chapterID int) ([]models.Scene, error) {
	rows, err := db.Query(`
		SELECT scene_id, chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description
		FROM scenes
		WHERE chapter_id = $1
		ORDER BY scene_id ASC
	`, chapterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	scenes := []models.Scene{}
	for rows.Next() {
		var s models.Scene
		err := rows.Scan(&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.Type, &s.EndingTitle, &s.EndingType, &s.EndingDescription)
		if err != nil {
			return nil, err
		}
		scenes = append(scenes, s)
	}
	return scenes, nil
}

// CreateScene บันทึกฉากใหม่
func CreateScene(db *sql.DB, scene models.Scene) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO scenes (chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING scene_id
	`, scene.ChapterID, scene.NovelID, scene.Title, scene.Content, scene.Type, scene.EndingTitle, scene.EndingType, scene.EndingDescription).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// CountScenesInNovel นับจำนวนฉากทั้งหมดในนิยายเรื่องนี้ (ใช้สำหรับ Automate Type 'start')
func CountScenesInNovel(db *sql.DB, novelID int) (int, error) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM scenes WHERE novel_id = $1`, novelID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
