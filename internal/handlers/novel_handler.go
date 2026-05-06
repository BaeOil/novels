package handlers

import (
    "encoding/json"
    "net/http"
    "novel-be/internal/service"
)

func GetNovels(service *service.NovelService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Access-Control-Allow-Origin", "*")

        novels, err := service.ListNovels()
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        json.NewEncoder(w).Encode(novels)
    }
}
