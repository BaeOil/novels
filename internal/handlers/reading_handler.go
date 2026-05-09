package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func GetProgressHandler(readingService service.ReadingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		userID, err := strconv.Atoi(r.URL.Query().Get("user_id"))
		if err != nil || userID == 0 {
			WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}

		novelID, err := strconv.Atoi(r.URL.Query().Get("novel_id"))
		if err != nil || novelID == 0 {
			WriteError(w, http.StatusBadRequest, "novel_id is required")
			return
		}

		progress, err := readingService.GetProgress(userID, novelID)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if progress == nil {
			WriteJSON(w, http.StatusOK, map[string]any{"message": "no progress found", "progress": nil})
			return
		}

		WriteJSON(w, http.StatusOK, progress)
	}
}

func ProgressHandler(readingService service.ReadingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			GetProgressHandler(readingService)(w, r)
		case http.MethodPost:
			SaveProgressHandler(readingService)(w, r)
		default:
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func SaveProgressHandler(readingService service.ReadingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req SaveProgressRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := readingService.SaveProgress(models.ReadingProgress{
			UserID:         req.UserID,
			NovelID:        req.NovelID,
			CurrentSceneID: req.CurrentSceneID,
		}); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]string{"message": "progress saved"})
	}
}

func RecordChoiceHistoryHandler(readingService service.ReadingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req RecordChoiceHistoryRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := readingService.RecordChoiceHistory(models.ChoiceHistory{UserID: req.UserID, ChoiceID: req.ChoiceID}); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]string{"message": "choice history recorded"})
	}
}
