package repository

import (
	"context"
	"database/sql"
	"encoding/json" // 👈 อย่าลืม import ตัวนี้เพิ่ม
	"novel-be/internal/models"
)

func GetNovels(db *sql.DB) ([]models.Novel, error) {
	rows, err := db.Query(`
		SELECT 
			n.novel_id, n.title, n.captions, n.introduction, n.cover_image,
			CASE
				WHEN n.is_completed AND n.is_published THEN 'completed-published'
				WHEN n.is_completed THEN 'completed-draft'
				WHEN n.is_published THEN 'published'
				ELSE 'draft'
			END AS status,
			n.is_published, n.is_completed,
			n.author_id, n.views, n.created_at, n.updated_at,
			-- counts
			(SELECT COUNT(*) FROM chapters ch WHERE ch.novel_id = n.novel_id) AS chapter_count,
			(SELECT COUNT(*) FROM scenes s WHERE s.novel_id = n.novel_id) AS scene_count,
			w.name_lastname, w.pen_name,
			COALESCE(COUNT(DISTINCT l.id), 0) AS like_count,
			(SELECT COALESCE(COUNT(*), 0) FROM bookshelves b WHERE b.novel_id = n.novel_id) AS bookshelf_count,
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
		LEFT JOIN likes l ON n.novel_id = l.novel_id
		WHERE n.is_published = TRUE
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
			&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status, &n.IsPublished, &n.IsCompleted,
			&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
			&n.ChapterCount, &n.SceneCount,
			&authorName, &penName,
			&n.LikeCount, &n.BookshelfCount,
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

		// แปลง JSON Byte ให้กลับกลายเป็น Array ใน Go
		if len(categoriesJSON) > 0 {
			err = json.Unmarshal(categoriesJSON, &n.Categories)
			if err != nil {
				return nil, err
			}
			for _, cat := range n.Categories {
				n.CategoryIDs = append(n.CategoryIDs, cat.CategoryID)
			}
		}

		novels = append(novels, n)
	}
	return novels, nil
}

func GetNovelByID(db *sql.DB, id int) (*models.Novel, error) {
	row := db.QueryRow(`
		SELECT 
			n.novel_id, n.title, n.captions, n.introduction, n.cover_image,
			CASE
				WHEN n.is_completed AND n.is_published THEN 'completed-published'
				WHEN n.is_completed THEN 'completed-draft'
				WHEN n.is_published THEN 'published'
				ELSE 'draft'
			END AS status,
			n.is_published, n.is_completed,
			n.author_id, n.views, n.created_at, n.updated_at,
			-- counts
			(SELECT COUNT(*) FROM chapters ch WHERE ch.novel_id = n.novel_id) AS chapter_count,
			(SELECT COUNT(*) FROM scenes s WHERE s.novel_id = n.novel_id) AS scene_count,
			w.name_lastname, w.pen_name,
			COALESCE(COUNT(DISTINCT l.id), 0) AS like_count,
			(SELECT COALESCE(COUNT(*), 0) FROM bookshelves b WHERE b.novel_id = n.novel_id) AS bookshelf_count,
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
		LEFT JOIN likes l ON n.novel_id = l.novel_id
		WHERE n.novel_id = $1
		GROUP BY n.novel_id, w.writer_id
	`, id)

	var n models.Novel
	var authorName, penName *string
	var categoriesJSON []byte

	err := row.Scan(
		&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status, &n.IsPublished, &n.IsCompleted,
		&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
		&n.ChapterCount, &n.SceneCount,
		&authorName, &penName,
		&n.LikeCount, &n.BookshelfCount,
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
		for _, cat := range n.Categories {
			n.CategoryIDs = append(n.CategoryIDs, cat.CategoryID)
		}
	}

	return &n, nil
}

func IncrementNovelViews(db *sql.DB, novelID int) error {
	_, err := db.Exec(`
		UPDATE novels
		SET views = views + 1
		WHERE novel_id = $1
	`, novelID)
	return err
}

func CreateNovel(db *sql.DB, novel models.Novel) (int, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	var id int
	// 1. สร้างนิยาย และขอ ID ของนิยายที่เพิ่งสร้างคืนมา
	err = tx.QueryRowContext(ctx, `
		INSERT INTO novels (title, captions, introduction, cover_image, status, is_published, is_completed, author_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING novel_id
	`, novel.Title, novel.Captions, novel.Introduction, novel.CoverImage, novel.Status, novel.IsPublished, novel.IsCompleted, novel.AuthorID).Scan(&id)
	if err != nil {
		return 0, err
	}

	// 2. ถ้ามีการส่งหมวดหมู่ (CategoryIDs) มาด้วย ให้บันทึกลงตารางกลาง
	if len(novel.CategoryIDs) > 0 {
		for _, catID := range novel.CategoryIDs {
			_, err = tx.ExecContext(ctx, `
				INSERT INTO novel_categories (novel_id, category_id) 
				VALUES ($1, $2)
			`, id, catID)

			if err != nil {
				return id, err // ถ้า Error ตอน insert หมวดหมู่ ให้ส่งกลับไปเลย และ rollback
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return 0, err
	}

	return id, nil
}

func UpdateNovel(db *sql.DB, novel models.Novel) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Update core novel fields, include cover_image
	if _, err = tx.ExecContext(ctx, `
		UPDATE novels
		SET title = $1,
		    captions = $2,
		    introduction = $3,
		    cover_image = $4,
		    status = $5,
		    is_published = $6,
		    is_completed = $7,
		    updated_at = NOW()
		WHERE novel_id = $8
	`, novel.Title, novel.Captions, novel.Introduction, novel.CoverImage, novel.Status, novel.IsPublished, novel.IsCompleted, novel.ID); err != nil {
		return err
	}

	// Replace category mappings: delete existing, then insert new if provided
	if _, err = tx.ExecContext(ctx, `DELETE FROM novel_categories WHERE novel_id = $1`, novel.ID); err != nil {
		return err
	}
	if len(novel.CategoryIDs) > 0 {
		for _, catID := range novel.CategoryIDs {
			if _, err = tx.ExecContext(ctx, `INSERT INTO novel_categories (novel_id, category_id) VALUES ($1, $2)`, novel.ID, catID); err != nil {
				return err
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func DeleteNovel(db *sql.DB, id int) error {
	_, err := db.Exec(`
		DELETE FROM novels
		WHERE novel_id = $1
	`, id)
	return err
}

func GetNovelsByAuthorID(db *sql.DB, authorID int) ([]models.Novel, error) {
	rows, err := db.Query(`
		SELECT 
			n.novel_id, n.title, n.captions, n.introduction, n.cover_image,
			CASE
				WHEN n.is_completed AND n.is_published THEN 'completed-published'
				WHEN n.is_completed THEN 'completed-draft'
				WHEN n.is_published THEN 'published'
				ELSE 'draft'
			END AS status,
			n.is_published, n.is_completed,
			n.author_id, n.views, n.created_at, n.updated_at,
			(SELECT COUNT(*) FROM chapters ch WHERE ch.novel_id = n.novel_id) AS chapter_count,
			(SELECT COUNT(*) FROM scenes s WHERE s.novel_id = n.novel_id) AS scene_count,
			w.name_lastname, w.pen_name,
			(SELECT COALESCE(COUNT(*), 0) FROM likes l WHERE l.novel_id = n.novel_id) AS like_count,
			(SELECT COALESCE(COUNT(*), 0) FROM bookshelves b WHERE b.novel_id = n.novel_id) AS bookshelf_count,
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
		WHERE n.author_id = $1
		GROUP BY n.novel_id, w.writer_id
		ORDER BY n.created_at DESC
	`, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var novels []models.Novel
	for rows.Next() {
		var n models.Novel
		var authorName, penName *string
		var categoriesJSON []byte

		err := rows.Scan(
			&n.ID, &n.Title, &n.Captions, &n.Introduction, &n.CoverImage, &n.Status, &n.IsPublished, &n.IsCompleted,
			&n.AuthorID, &n.Views, &n.CreatedAt, &n.UpdatedAt,
			&n.ChapterCount, &n.SceneCount,
			&authorName, &penName,
			&n.LikeCount, &n.BookshelfCount,
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
