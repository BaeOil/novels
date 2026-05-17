package handlers

import (
	"net/http"
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
