package handlers

import (
	"encoding/json"
	"net/http"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func CreateChapterHandler(chapterService service.ChapterService) http.HandlerFunc {
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

		RespondWithJSON(w, http.StatusCreated, map[string]any{"message": "chapter created", "chapter_id": chapterID})
	}
}
