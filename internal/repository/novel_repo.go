package repository

import (
	"database/sql"
	"encoding/json" // 👈 อย่าลืม import ตัวนี้เพิ่ม
	"novel-be/internal/models"
)

func GetNovels(db *sql.DB) ([]models.Novel, error) {
	rows, err := db.Query(`
		SELECT 
			n.novel_id, n.title, n.captions, n.introduction, n.cover_image, n.status,
			n.author_id, n.views, n.created_at, n.updated_at,
			w.name_lastname, w.pen_name,
			
			-- รวมหมวดหมู่เป็น JSON Array
			COALESCE(
				json_agg(
					json_build_object('category_id', c.category_id, 'name', c.name)
				) FILTER (WHERE c.category_id IS NOT NULL), '[]'
			) AS categories_json

		FROM novels n
		LEFT JOIN writers w ON n.author_id = w.writer_id
		LEFT JOIN novel_categories nc ON n.novel_id = nc.novel_id
		LEFT JOIN categories c ON nc.category_id = c.category_id
		GROUP BY n.novel_id, w.writer_id
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
		var categoriesJSON []byte // ตัวแปรมารับค่า JSON

		err := rows.Scan(
			&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status,
			&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
			&authorName, &penName,
			&categoriesJSON, // 👈 Scan ใส่ตัวแปรนี้
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

		// แปลง JSON Byte ให้กลับกลายเป็น Array ใน Go
		if len(categoriesJSON) > 0 {
			err = json.Unmarshal(categoriesJSON, &n.Categories)
			if err != nil {
				return nil, err
			}
		}

		novels = append(novels, n)
	}
	return novels, nil
}

func GetNovelByID(db *sql.DB, id int) (*models.Novel, error) {
	row := db.QueryRow(`
		SELECT 
			n.novel_id, n.title, n.captions, n.introduction, n.cover_image, n.status,
			n.author_id, n.views, n.created_at, n.updated_at,
			w.name_lastname, w.pen_name,
			
			-- รวมหมวดหมู่เป็น JSON Array
			COALESCE(
				json_agg(
					json_build_object('category_id', c.category_id, 'name', c.name)
				) FILTER (WHERE c.category_id IS NOT NULL), '[]'
			) AS categories_json

		FROM novels n
		LEFT JOIN writers w ON n.author_id = w.writer_id
		LEFT JOIN novel_categories nc ON n.novel_id = nc.novel_id
		LEFT JOIN categories c ON nc.category_id = c.category_id
		WHERE n.novel_id = $1
		GROUP BY n.novel_id, w.writer_id
	`, id)

	var n models.Novel
	var authorName, penName *string
	var categoriesJSON []byte

	err := row.Scan(
		&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status,
		&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
		&authorName, &penName,
		&categoriesJSON,
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

	// แปลง JSON
	if len(categoriesJSON) > 0 {
		err = json.Unmarshal(categoriesJSON, &n.Categories)
		if err != nil {
			return nil, err
		}
	}

	return &n, nil
}

func CreateNovel(db *sql.DB, novel models.Novel) (int, error) {
	var id int

	// 1. สร้างนิยาย และขอ ID ของนิยายที่เพิ่งสร้างคืนมา
	err := db.QueryRow(`
		INSERT INTO novels (title, captions, introduction, cover_image, status, author_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING novel_id
	`, novel.Title, novel.Captions, novel.Introduction, novel.CoverImage, novel.Status, novel.AuthorID).Scan(&id)

	if err != nil {
		return 0, err
	}

	// 2. ถ้ามีการส่งหมวดหมู่ (CategoryIDs) มาด้วย ให้บันทึกลงตารางกลาง
	if len(novel.CategoryIDs) > 0 {
		for _, catID := range novel.CategoryIDs {
			_, err := db.Exec(`
				INSERT INTO novel_categories (novel_id, category_id) 
				VALUES ($1, $2)
			`, id, catID)

			if err != nil {
				return id, err // ถ้า Error ตอน insert หมวดหมู่ ให้ส่งกลับไปเลย
			}
		}
	}

	return id, nil

}
