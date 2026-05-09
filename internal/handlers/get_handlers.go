package handlers

import (
	"net/http"
	"novel-be/internal/service"
	"strconv"
	"strings"
)

// GET /novels/{id} or /novels/{id}/start
func GetNovelDetailHandler(novelService service.NovelService, sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		path = strings.TrimSuffix(path, "/")

		// Check if this is a /start request
		if strings.HasSuffix(path, "/start") {
			idStr := strings.TrimSuffix(path, "/start")
			id, err := strconv.Atoi(strings.Trim(idStr, "/"))
			if err != nil || id <= 0 {
				RespondWithError(w, http.StatusBadRequest, "invalid novel id", err.Error())
				return
			}

			response, err := sceneService.GetStartScene(id)
			if err != nil {
				RespondWithError(w, http.StatusNotFound, "start scene not found", err.Error())
				return
			}

			RespondWithJSON(w, http.StatusOK, response)
			return
		}

		// Otherwise, treat it as a novel detail request
		id, err := strconv.Atoi(path)
		if err != nil || id <= 0 {
			RespondWithError(w, http.StatusBadRequest, "invalid novel id", err.Error())
			return
		}

		novel, err := novelService.GetNovelDetail(id)
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "novel not found", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, novel)
	}
}

// GET /novels/{id}/chapters
func GetChaptersByNovelHandler(chapterService service.ChapterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only GET is supported")
			return
		}

		// Extract novelID from path: /novels/{id}/chapters
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

		// Extract chapterID from path: /chapters/{id}/scenes
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

		// Extract novelID from path: /novels/{id}/comments
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

		// Extract sceneID from path: /scenes/{id}/comments
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

		idStr := strings.TrimPrefix(r.URL.Path, "/writer/")
		id, err := strconv.Atoi(strings.TrimSuffix(idStr, "/"))
		if err != nil || id <= 0 {
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

// POST /upload - Upload image to MinIO
func UploadImageHandler(mediaService service.MediaService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			RespondWithError(w, http.StatusMethodNotAllowed, "method not allowed", "only POST is supported")
			return
		}

		// Parse multipart form with max 10MB size
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

		RespondWithCreated(w, "image uploaded successfully", map[string]interface{}{
			"url":      url,
			"filename": handler.Filename,
		})
	}
}
