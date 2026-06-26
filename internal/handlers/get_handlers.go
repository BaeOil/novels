package handlers

import (
	"errors"
	"net/http"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
	"strconv"
	"strings"
)

func extractIDFromPath(urlPath, prefix string) (int, error) {
	// ตัด query string ออกก่อน เช่น /novels/1/start?user_id=1 → /novels/1/start
	if idx := strings.Index(urlPath, "?"); idx != -1 {
		urlPath = urlPath[:idx]
	}

	trimmed := strings.TrimPrefix(urlPath, prefix)
	trimmed = strings.Trim(trimmed, "/")
	if trimmed == "" {
		return 0, errors.New("missing id")
	}
	if idx := strings.Index(trimmed, "/"); idx != -1 {
		trimmed = trimmed[:idx]
	}
	id, err := strconv.Atoi(trimmed)
	if err != nil || id <= 0 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}

// GET /novels/{id}
func GetNovelDetailHandler(novelService service.NovelService, sceneService service.SceneService, socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		id, err := extractIDFromPath(r.URL.Path, "/novels/")
		if err != nil {
			RespondWithError(w, http.StatusBadRequest, "invalid novel id", err.Error())
			return
		}

		// เพิ่มยอดวิวเมื่อผู้ใช้เข้าหน้านิยาย
		if err := novelService.IncrementViews(id); err != nil {
			// ถ้าเพิ่มยอดวิวล้มเหลว ไม่ขัดขวางการแสดงรายละเอียดนิยาย
			// สามารถ log เพิ่มได้ที่ middleware หรือ logger ภายนอก
		}

		// ดึงข้อมูลรายละเอียดนิยายดั้งเดิม
		novel, err := novelService.GetNovelDetail(id)
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "novel not found", err.Error())
			return
		}

		// ถ้ามี user_id มาให้ตรวจว่า user นี้กดไลค์นิยายเรื่องนี้หรือยัง
		userID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
		if userID > 0 {
			liked, err := socialService.IsLikeExists(userID, id)
			if err == nil {
				if novelModel, ok := novel.(*models.Novel); ok {
					novelModel.IsLiked = liked
				}
			}
		}

		// =================================================================
		// 🎯 ส่วนที่เพิ่ม: คำนวณสถิติเพื่อส่งไปให้หน้ารายละเอียดนิยาย (Novel Detail)
		// =================================================================

		visitedCount := 0
		totalScenes := 0
		discoveredChoices := 0
		totalChoices := 0
		unlockedEndings := 0
		totalEndings := 0

		// เรียกใช้สิทธิ์บริการ GetStoryTree ตัวเดิมที่เพิ่งเขียนเสร็จมาคำนวณสด
		tree, err := sceneService.GetStoryTree(id, userID)
		if err == nil {
			totalScenes = len(tree.Nodes)
			totalChoices = len(tree.Edges)

			unlockedNodesMap := make(map[int]bool)

			for _, rawNode := range tree.Nodes {
				if rawNode.Type == "ending" {
					totalEndings++
					if rawNode.IsUnlocked {
						unlockedEndings++
					}
				}

				// เงื่อนไขเปิดไฟโหนดเหมือนในหน้าผังกิ่งไม้
				isNodeAccessible := rawNode.IsUnlocked || rawNode.ID == 1 || rawNode.Type == "start"
				if isNodeAccessible {
					visitedCount++
					unlockedNodesMap[rawNode.ID] = true
				}
			}

			// คำนวณเส้นเลือกที่ผ่าน
			for _, edge := range tree.Edges {
				if unlockedNodesMap[edge.FromID] {
					discoveredChoices++
				}
			}
		}

		endings, err := sceneService.GetEndingsByNovelID(id, userID)
		if err != nil {
			endings = []models.EndingScene{}
		}

		// ประกอบร่าง Response ใหม่ ผนึกข้อมูลนิยาย และก้อนสถิติจริงส่งออกไปหา React
		finalDetailResponse := map[string]interface{}{
			"novel":              novel,             // ข้อมูลนิยายก้อนเดิม (ชื่อเรื่อง, คำโปรย, ยอดวิว ฯลฯ)
			"visited_scenes":     visitedCount,      // จำนวนตอนที่อ่านแล้ว (การ์ดชมพูซ้าย)
			"total_scenes":       totalScenes,       // จำนวนตอนทั้งหมด
			"discovered_choices": discoveredChoices, // ช้อยส์ที่เจอ (ช้อยส์ที่ผ่านแล้ว)
			"total_choices":      totalChoices,      // ช้อยส์ทั้งหมด
			"unlocked_endings":   unlockedEndings,   // ฉากจบที่ปลด
			"total_endings":      totalEndings,      // ฉากจบทั้งหมด
			"endings":            endings,
		}
		RespondWithJSON(w, http.StatusOK, finalDetailResponse)
	}
}

// GET /novels/{id}/chapters
func GetChaptersByNovelHandler(chapterService service.ChapterService, novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 || parts[1] != "chapters" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /novels/{id}/chapters")
			return
		}

		novelIDStr := strings.TrimSpace(parts[0])
		novelID, err := strconv.Atoi(novelIDStr)
		if err != nil || novelID <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid novel_id", err.Error())
			return
		}

		// 🔒 ตรวจสอบสิทธิ์: ถ้าเป็นการเรียกจากผู้ใช้ที่ login แล้ว ต้องเช็คว่านิยายนี้เป็นของเขาหรือเปล่า
		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if ok && userID != 0 {
			// ผู้ใช้ logged in - ต้องตรวจสอบ ownership
			writer, err := writerService.GetWriterByUserID(int(userID))
			if err != nil || writer == nil {
				// ไม่ใช่นักเขียน แต่ขอข้อมูล chapter - อาจเป็นผู้อ่าน ให้ return 403
				WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์ดูข้อมูลนี้")
				return
			}

			novelDetail, err := novelService.GetNovelDetail(novelID)
			if err != nil {
				WriteError(w, http.StatusNotFound, "novel not found")
				return
			}

			novelPtr, ok := novelDetail.(*models.Novel)
			if !ok || novelPtr == nil {
				WriteError(w, http.StatusInternalServerError, "failed to load novel details")
				return
			}

			if novelPtr.AuthorID != writer.WriterID {
				WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์ดูบทของนิยายเรื่องนี้")
				return
			}
		}

		chapters, err := chapterService.GetChaptersByNovelID(novelID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch chapters", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"novel_id": novelID,
			"chapters": chapters,
		})
	}
}

// GET /chapters/{id}/scenes
func GetScenesByChapterHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/chapters/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 || parts[1] != "scenes" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /chapters/{id}/scenes")
			return
		}

		chapterIDStr := strings.TrimSpace(parts[0])
		chapterID, err := strconv.Atoi(chapterIDStr)
		if err != nil || chapterID <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid chapter_id", err.Error())
			return
		}

		scenes, err := sceneService.GetScenesByChapterID(chapterID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch scenes", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"chapter_id": chapterID,
			"scenes":     scenes,
		})
	}
}

// GET /novels/{id}/comments
func GetCommentsByNovelHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 || parts[1] != "comments" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /novels/{id}/comments")
			return
		}

		novelIDStr := strings.TrimSpace(parts[0])
		novelID, err := strconv.Atoi(novelIDStr)
		if err != nil || novelID <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid novel_id", err.Error())
			return
		}

		comments, err := socialService.GetCommentsByNovelID(novelID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch comments", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"comments": comments,
		})
	}
}

// GET /scenes/{id}/comments
func GetCommentsBySceneHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/scenes/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 || parts[1] != "comments" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /scenes/{id}/comments")
			return
		}

		sceneIDStr := strings.TrimSpace(parts[0])
		sceneID, err := strconv.Atoi(sceneIDStr)
		if err != nil || sceneID <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid scene_id", err.Error())
			return
		}

		comments, err := socialService.GetCommentsBySceneID(sceneID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch comments", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"comments": comments,
		})
	}
}

// GET /writer/{id}
func GetWriterDetailHandler(writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		id, err := extractIDFromPath(r.URL.Path, "/writer/")
		if err != nil {
			RespondWithError(w, http.StatusBadRequest, "invalid writer id", err.Error())
			return
		}

		writer, err := writerService.GetWriterByID(id)
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "writer not found", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, writer)
	}
}

func GetWriterBookshelfCountsHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/writer/")
		parts := strings.Split(strings.TrimSuffix(path, "/"), "/")
		if len(parts) != 2 || parts[1] != "bookshelf-counts" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /writer/{id}/bookshelf-counts")
			return
		}

		id, err := strconv.Atoi(parts[0])
		if err != nil || id <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid writer id", err.Error())
			return
		}

		novels, err := socialService.GetBookshelfCountsByAuthorID(id)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch bookshelf counts", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"author_id": id,
			"novels":    novels,
		})
	}
}

func GetWriterTotalViewsHandler(writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/writer/")
		parts := strings.Split(strings.TrimSuffix(path, "/"), "/")
		if len(parts) != 2 || parts[1] != "total-views" {
			RespondWithError(w, http.StatusBadRequest, "invalid path format", "expected /writer/{id}/total-views")
			return
		}

		id, err := strconv.Atoi(parts[0])
		if err != nil || id <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid writer id", err.Error())
			return
		}

		writer, err := writerService.GetWriterByID(id)
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "writer not found", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"author_id":        id,
			"total_view_count": writer.TotalViewCount,
		})
	}
}

// POST /upload - Upload image to MinIO and Update Database
func UploadImageHandler(mediaService service.MediaService, novelService service.NovelService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only POST is supported")
			return
		}

		if err := r.ParseMultipartForm(10 * 1024 * 1024); err != nil {
			RespondWithError(w, http.StatusBadRequest, "failed to parse form", err.Error())
			return
		}

		file, handler, err := r.FormFile("image")
		if err != nil {
			RespondWithError(w, http.StatusBadRequest, "missing image file", err.Error())
			return
		}
		defer file.Close()

		url, err := mediaService.UploadImage(r.Context(), handler)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to upload image", err.Error())
			return
		}

		dbPathToSave := url

		novelIDStr := r.FormValue("novel_id")
		var dbStatus string = "not updated"

		if novelIDStr != "" {
			novelID, err := strconv.Atoi(novelIDStr)
			if err == nil && novelID > 0 {
				err = novelService.UpdateNovelCover(novelID, dbPathToSave)
				if err != nil {
					dbStatus = "failed to update database: " + err.Error()
				} else {
					dbStatus = "successfully updated database"
				}
			}
		}

		RespondWithCreated(w, "process completed", map[string]interface{}{
			"full_url":   url,
			"saved_path": dbPathToSave,
			"filename":   handler.Filename,
			"db_status":  dbStatus,
		})
	}
}

// GET /me/novels - Get novels written by the logged-in user
func GetMyNovelsHandler(novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			RespondWithError(w, http.StatusUnauthorized, "unauthorized", "user_id not found in context")
			return
		}

		writer, err := writerService.GetWriterByUserID(int(userID))
		if err != nil || writer == nil {
			RespondWithError(w, http.StatusForbidden, "forbidden", "คุณยังไม่ใช่นักเขียนที่ได้รับอนุมัติ")
			return
		}

		authorID := writer.WriterID

		novels, err := novelService.GetNovelsByAuthorID(authorID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch novels", err.Error())
			return
		}

		if novels == nil {
			novels = []models.Novel{}
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"author_id": authorID,
			"novels":    novels,
		})
	}
}
