package routes

import (
	"net/http"

	"novel-be/internal/handlers"
	"novel-be/internal/service"
)

func RegisterRoutes(flow *service.FlowService, novel *service.NovelService, scene *service.SceneService) {
	http.HandleFunc("/health", handlers.HealthCheck(scene))
	http.HandleFunc("/", handlers.GetRoot(flow))
	http.HandleFunc("/novels", handlers.GetNovels(novel))
	http.HandleFunc("/reader/scenes/", handlers.GetSceneHandler(scene))
}
