package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/service"
)

// GetAllCategoriesHandler ปรับให้รับ Service แล้ว return http.HandlerFunc
func GetAllCategoriesHandler(s service.CategoryService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categories, err := s.GetCategories()
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "failed to fetch categories", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, categories)
	}
}

type CategoryRequest struct {
	Name string `json:"name"`
}

func AdminCreateCategoryHandler(s service.CategoryService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed", "method not allowed")
			return
		}

		var req CategoryRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError(w, http.StatusBadRequest, "Invalid request payload", err.Error())
			return
		}

		c, err := s.CreateCategory(r.Context(), req.Name)
		if err != nil {
			if errors.Is(err, service.ErrInvalidCategoryName) {
				RespondWithError(w, http.StatusBadRequest, "Category name cannot be empty", err.Error())
				return
			}
			if errors.Is(err, service.ErrCategoryDuplicate) {
				RespondWithError(w, http.StatusConflict, "Category name already exists", err.Error())
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Failed to create category", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusCreated, c)
	}
}

func AdminUpdateCategoryHandler(s service.CategoryService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed", "method not allowed")
			return
		}

		pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/categories/")
		pathID = strings.Trim(pathID, "/")
		id, err := strconv.Atoi(pathID)
		if err != nil || id <= 0 {
			RespondWithError(w, http.StatusBadRequest, "Invalid category ID", "invalid category_id")
			return
		}

		var req CategoryRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError(w, http.StatusBadRequest, "Invalid request payload", err.Error())
			return
		}

		c, err := s.UpdateCategory(r.Context(), id, req.Name)
		if err != nil {
			if errors.Is(err, service.ErrInvalidCategoryName) {
				RespondWithError(w, http.StatusBadRequest, "Category name cannot be empty", err.Error())
				return
			}
			if errors.Is(err, service.ErrCategoryNotFound) {
				RespondWithError(w, http.StatusNotFound, "Category not found", err.Error())
				return
			}
			if errors.Is(err, service.ErrCategoryDuplicate) {
				RespondWithError(w, http.StatusConflict, "Category name already exists", err.Error())
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Failed to update category", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, c)
	}
}

func AdminDeleteCategoryHandler(s service.CategoryService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed", "method not allowed")
			return
		}

		pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/categories/")
		pathID = strings.Trim(pathID, "/")
		id, err := strconv.Atoi(pathID)
		if err != nil || id <= 0 {
			RespondWithError(w, http.StatusBadRequest, "Invalid category ID", "invalid category_id")
			return
		}

		err = s.DeleteCategory(r.Context(), id)
		if err != nil {
			if errors.Is(err, service.ErrCategoryNotFound) {
				RespondWithError(w, http.StatusNotFound, "Category not found", err.Error())
				return
			}
			if errors.Is(err, service.ErrCategoryInUse) {
				RespondWithError(w, http.StatusConflict, "Category is still in use", err.Error())
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Failed to delete category", err.Error())
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "ลบหมวดหมู่สำเร็จแล้ว",
		})
	}
}
