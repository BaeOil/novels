package handlers

import (
	"encoding/json"
	"net/http"
	"novel-be/internal/service"
)

// GetAllCategoriesHandler ปรับให้รับ Service แล้ว return http.HandlerFunc
func GetAllCategoriesHandler(s service.CategoryService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categories, err := s.GetCategories()
		if err != nil {
			http.Error(w, "Failed to fetch categories", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(categories)
	}
}