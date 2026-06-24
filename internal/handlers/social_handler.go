package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

func AddLikeHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var req LikeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.UserID = int(userID)
		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := socialService.AddLike(models.Like{UserID: req.UserID, NovelID: req.NovelID}); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]string{"message": "like recorded"})
	}
}

func RemoveLikeHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == 0 {
			WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		novelIDStr := r.URL.Query().Get("novel_id")
		if novelIDStr == "" {
			WriteError(w, http.StatusBadRequest, "novel_id is required")
			return
		}

		novelID, err := strconv.Atoi(novelIDStr)
		if err != nil || novelID == 0 {
			WriteError(w, http.StatusBadRequest, "invalid novel_id")
			return
		}

		if err := socialService.RemoveLike(int(userID), novelID); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusOK, map[string]string{"message": "like removed"})
	}
}

func AddCommentHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req CommentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		commentID, err := socialService.AddComment(models.Comment{UserID: req.UserID, NovelID: req.NovelID, SceneID: req.SceneID, Content: req.Content})
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]any{"message": "comment added", "comment_id": commentID})
	}
}

func AddFollowHandler(socialService service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req FollowRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := req.Validate(); err != nil {
			WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := socialService.AddFollow(models.Follow{FollowerID: req.FollowerID, FollowingID: req.FollowingID}); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		WriteJSON(w, http.StatusCreated, map[string]string{"message": "follow recorded"})
	}
}
