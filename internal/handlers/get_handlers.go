package handlers

import (
	"errors"
	"net/http"
	"novel-be/internal/service"
	"strconv"
	"strings"
)

func extractIDFromPath(urlPath, prefix string) (int, error) {
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
func GetNovelDetailHandler(novelService service.NovelService, sceneService service.SceneService) http.HandlerFunc {
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

		// ดึงข้อมูลรายละเอียดนิยายดั้งเดิม
		novel, err := novelService.GetNovelDetail(id)
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "novel not found", err.Error())
			return
		}

		// =================================================================
		// 🎯 ส่วนที่เพิ่ม: คำนวณสถิติเพื่อส่งไปให้หน้ารายละเอียดนิยาย (Novel Detail)
		// =================================================================
		// 🟢 ดึง user_id จาก query string เผื่อเอาไว้เช็คประวัติปลดล็อกรายบุคคล
		userID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))

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

		// ประกอบร่าง Response ใหม่ ผนึกข้อมูลนิยาย และก้อนสถิติจริงส่งออกไปหา React
		finalDetailResponse := map[string]interface{}{
			"novel":              novel,             // ข้อมูลนิยายก้อนเดิม (ชื่อเรื่อง, คำโปรย, ยอดวิว ฯลฯ)
			"visited_scenes":     visitedCount,      // จำนวนตอนที่อ่านแล้ว (การ์ดชมพูซ้าย)
			"total_scenes":       totalScenes,       // จำนวนตอนทั้งหมด
			"discovered_choices": discoveredChoices, // ช้อยส์ที่เจอ (การ์ดชมพูขวา)
			"total_choices":      totalChoices,      // ช้อยส์ทั้งหมด
			"unlocked_endings":   unlockedEndings,   // ฉากจบที่ปลด (ตัวเลขหน้าเลข /)
			"total_endings":      totalEndings,      // ฉากจบทั้งหมดหลังเลข /
		}

		RespondWithJSON(w, http.StatusOK, finalDetailResponse)
	}
}

// GET /novels/{id}/chapters
func GetChaptersByNovelHandler(chapterService service.ChapterService) http.HandlerFunc {
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
