package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func CreateChapterHandler(chapterService service.ChapterService, notificationService service.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			RespondWithError3(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req CreateChapterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError3(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			RespondWithError3(w, http.StatusBadRequest, err.Error())
			return
		}

		chapterID, err := chapterService.CreateChapter(models.Chapter{
			NovelID: req.NovelID,
			Episode: req.Episode,
			Title:   req.Title,
			Status:  req.Status,
		})
		if err != nil {
			RespondWithError3(w, http.StatusInternalServerError, err.Error())
			return
		}

		if err := notificationService.NotifyNovelChapterPublished(req.NovelID, chapterID); err != nil {
			log.Printf("NotifyNovelChapterPublished failed: %v", err)
		}

		RespondWithJSON(w, http.StatusCreated, map[string]any{"message": "chapter created", "chapter_id": chapterID})
	}
}

func UpdateChapterHandler(chapterService service.ChapterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			RespondWithError3(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(pathParts) < 2 {
			RespondWithError3(w, http.StatusBadRequest, "invalid chapter id")
			return
		}

		chapterID, err := strconv.Atoi(pathParts[1])
		if err != nil {
			RespondWithError3(w, http.StatusBadRequest, "invalid chapter id")
			return
		}

		var req UpdateChapterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError3(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			RespondWithError3(w, http.StatusBadRequest, err.Error())
			return
		}

		chapter, err := chapterService.GetChapterByID(chapterID)
		if err != nil {
			RespondWithError3(w, http.StatusInternalServerError, err.Error())
			return
		}
		if chapter == nil {
			RespondWithError3(w, http.StatusNotFound, "chapter not found")
			return
		}

		if strings.TrimSpace(req.Title) != "" {
			chapter.Title = req.Title
		}
		if strings.TrimSpace(req.Status) != "" {
			chapter.Status = req.Status
		}

		if err := chapterService.UpdateChapter(*chapter); err != nil {
			RespondWithError3(w, http.StatusInternalServerError, err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]any{"message": "chapter updated"})
	}
}

func DeleteChapterHandler(chapterService service.ChapterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			RespondWithError3(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		chapterID, err := extractIDFromPath(r.URL.Path, "/chapters/")
		if err != nil {
			RespondWithError3(w, http.StatusBadRequest, "invalid chapter id")
			return
		}

		if err := chapterService.DeleteChapter(chapterID); err != nil {
			RespondWithError3(w, http.StatusInternalServerError, err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]any{"message": "chapter deleted"})
	}
}

func ReorderChaptersHandler(chapterService service.ChapterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			RespondWithError3(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var payload struct {
			Order []int `json:"order"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			RespondWithError3(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if len(payload.Order) == 0 {
			RespondWithError3(w, http.StatusBadRequest, "order empty")
			return
		}

		if err := chapterService.ReorderChapters(payload.Order); err != nil {
			RespondWithError3(w, http.StatusInternalServerError, err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]any{"message": "chapters reordered"})
	}
}
