package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

// GetSceneByID ดึงข้อมูลฉากจาก ID
func GetSceneByID(db *sql.DB, id int) (*models.Scene, error) {
	var endingTitle, endingType, endingDescription sql.NullString

	// 🎯 ใช้ INNER JOIN ไปเกี่ยวเอาชื่อเรื่องนิยายหลัก และชื่อตอนย่อยมาพร้อมกันเลยครับน้า
	row := db.QueryRow(`
		SELECT 
			s.scene_id, s.chapter_id, s.novel_id, s.title, s.content, s.image_url, s.type, 
			s.ending_title, s.ending_type, s.ending_description,
			n.title AS novel_title,
			c.title AS chapter_title
		FROM scenes s
		INNER JOIN novels n ON s.novel_id = n.novel_id
		INNER JOIN chapters c ON s.chapter_id = c.chapter_id
		WHERE s.scene_id = $1
	`, id)

	var s models.Scene
	err := row.Scan(
		&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.ImageURL, &s.Type, 
		&endingTitle, &endingType, &endingDescription,
		&s.NovelTitle, &s.ChapterTitle, // 👈 แสกนค่าชื่อเรื่องและชื่อตอนลงตัวแปรพิเศษ
	)
	if err != nil {
		return nil, err
	}

	if endingTitle.Valid { s.EndingTitle = &endingTitle.String }
	if endingType.Valid { s.EndingType = &endingType.String }
	if endingDescription.Valid { s.EndingDescription = &endingDescription.String }

	return &s, nil
}

// GetStartSceneByNovelID หาจุดเริ่มต้นของนิยายร่วมกับชื่อเรื่องนิยายและชื่อตอน 
func GetStartSceneByNovelID(db *sql.DB, novelID int) (*models.Scene, error) {
	var endingTitle, endingType, endingDescription sql.NullString

	// 🎯 ใช้ INNER JOIN ข้ามสายพันธุ์ตรงจุดสตาร์ทด้วยเช่นกันครับน้า
	row := db.QueryRow(`
		SELECT 
			s.scene_id, s.chapter_id, s.novel_id, s.title, s.content, s.image_url, s.type, 
			s.ending_title, s.ending_type, s.ending_description,
			n.title AS novel_title,
			c.title AS chapter_title
		FROM scenes s
		INNER JOIN novels n ON s.novel_id = n.novel_id
		INNER JOIN chapters c ON s.chapter_id = c.chapter_id
		WHERE s.novel_id = $1 AND s.type = 'start'
		LIMIT 1
	`, novelID)

	var s models.Scene
	err := row.Scan(
		&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.ImageURL, &s.Type, 
		&endingTitle, &endingType, &endingDescription,
		&s.NovelTitle, &s.ChapterTitle, // 👈 แสกนค่าชื่อเรื่องและชื่อตอนลงตัวแปรพิเศษ
	)
	if err != nil {
		return nil, err
	}

	if endingTitle.Valid { s.EndingTitle = &endingTitle.String }
	if endingType.Valid { s.EndingType = &endingType.String }
	if endingDescription.Valid { s.EndingDescription = &endingDescription.String }

	return &s, nil
}

// GetScenesByChapterID ดึงฉากทั้งหมดในตอนนั้นๆ
func GetScenesByChapterID(db *sql.DB, chapterID int) ([]models.Scene, error) {
	rows, err := db.Query(`
		SELECT scene_id, chapter_id, novel_id, title, content, image_url, type, ending_title, ending_type, ending_description
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
		err := rows.Scan(&s.SceneID, &s.ChapterID, &s.NovelID, &s.Title, &s.Content, &s.ImageURL, &s.Type, &s.EndingTitle, &s.EndingType, &s.EndingDescription)
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
		INSERT INTO scenes (chapter_id, novel_id, title, content, image_url, type, ending_title, ending_type, ending_description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING scene_id
	`, scene.ChapterID, scene.NovelID, scene.Title, scene.Content, scene.ImageURL, scene.Type, scene.EndingTitle, scene.EndingType, scene.EndingDescription).Scan(&id)
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

func (r *postgresSceneRepository) CheckSceneExists(chapterID int, title string) (bool, error) {
	var exists bool
	// เช็คว่าใน Chapter เดียวกัน มีฉากที่ชื่อซ้ำกันไหม
	query := `SELECT EXISTS(SELECT 1 FROM scenes WHERE chapter_id=$1 AND title=$2)`
	err := r.db.QueryRow(query, chapterID, title).Scan(&exists)
	return exists, err
}

func (r *postgresSceneRepository) GetNodesByNovelID(novelID int) ([]models.SceneNode, error) {
	query := `SELECT scene_id, title, type FROM scenes WHERE novel_id = $1`
	rows, err := r.db.Query(query, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []models.SceneNode
	for rows.Next() {
		var n models.SceneNode
		if err := rows.Scan(&n.ID, &n.Label, &n.Type); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}

func (r *postgresSceneRepository) GetEdgesByNovelID(novelID int) ([]models.SceneEdge, error) {
	query := `
		SELECT c.from_scene_id, c.to_scene_id, c.label
		FROM choices c
		JOIN scenes s ON c.from_scene_id = s.scene_id
		WHERE s.novel_id = $1`
	rows, err := r.db.Query(query, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var edges []models.SceneEdge
	for rows.Next() {
		var e models.SceneEdge
		if err := rows.Scan(&e.FromID, &e.ToID, &e.Label); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	return edges, nil
}

func (r *postgresSceneRepository) GetNodesByNovelIDForUser(novelID int, userID int) ([]models.SceneNode, error) {
	// ใช้ LEFT JOIN กับ user_scene_history เพื่อเช็คว่า User เคยมาที่นี่หรือยัง
	query := `
        SELECT s.scene_id, s.title, s.type, 
               CASE WHEN ush.id IS NOT NULL THEN true ELSE false END as is_unlocked
        FROM scenes s
        LEFT JOIN user_scene_history ush ON s.scene_id = ush.scene_id AND ush.user_id = $2
        WHERE s.novel_id = $1`

	rows, err := r.db.Query(query, novelID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []models.SceneNode
	for rows.Next() {
		var n models.SceneNode
		if err := rows.Scan(&n.ID, &n.Label, &n.Type, &n.IsUnlocked); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}
