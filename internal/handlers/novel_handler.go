package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

func NovelsHandler(novelService service.NovelService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			novels, err := novelService.ListNovels()
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			WriteJSON(w, http.StatusOK, novels)
		case http.MethodPost:
			var req CreateNovelRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			if err := req.Validate(); err != nil {
				WriteError(w, http.StatusBadRequest, err.Error())
				return
			}

			novelID, err := novelService.CreateNovel(models.Novel{
				Title:        req.Title,
				Captions:     req.Captions,
				Introduction: req.Introduction,
				CoverImage:   req.CoverImage,
				Status:       req.Status,
				CategoryIDs:  req.CategoryIDs,
				AuthorID:     req.AuthorID,
			})
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err.Error())
				return
			}
			WriteJSON(w, http.StatusCreated, map[string]any{"message": "novel created", "novel_id": novelID})
		default:
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func NovelSubRouteHandler(sceneService service.SceneService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		if !strings.HasSuffix(path, "/start") {
			http.NotFound(w, r)
			return
		}

		idStr := strings.TrimSuffix(path, "/start")
		id, err := strconv.Atoi(strings.Trim(idStr, "/"))
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		response, err := sceneService.GetStartScene(id)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, response)
	}
}
