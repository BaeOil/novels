package routes

import (
	"net/http"

	"novel-be/internal/handlers"
	"novel-be/internal/middleware"
	"novel-be/internal/service"
)

func RegisterRoutes(
	flow service.FlowService,
	novel service.NovelService,
	chapter service.ChapterService,
	scene service.SceneService,
	social service.SocialService,
	reading service.ReadingService,
	writer service.WriterService,
	media service.MediaService,
	category service.CategoryService, // 👈 1. เพิ่ม parameter ตรงนี้
) {
	// Health & Root
	http.HandleFunc("GET /health", middleware.RequestLogger(http.HandlerFunc(handlers.HealthCheck(scene))).ServeHTTP)
	http.HandleFunc("GET /", middleware.RequestLogger(http.HandlerFunc(handlers.GetRoot(flow))).ServeHTTP)

	// ==========================================
	// 🟢 Category Endpoints
	// ==========================================
	http.HandleFunc("GET /categories", middleware.RequestLogger(http.HandlerFunc(handlers.GetAllCategoriesHandler(category))).ServeHTTP) // 👈 2. เพิ่ม Route ตรงนี้

	// Novel Endpoints (GET list, POST create)
	http.HandleFunc("GET /novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.NovelsHandler(novel)(w, r)
	})).ServeHTTP)

	http.HandleFunc("POST /novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.NovelsHandler(novel)(w, r)
	})).ServeHTTP)

	// ---------------------------------------------------------------------
	// 🟢 RESTful API (Path Parameters)
	// ---------------------------------------------------------------------

	// ดึงรายละเอียดนิยาย
	http.HandleFunc("GET /novels/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetNovelDetailHandler(novel, scene))).ServeHTTP)

	// ดึงตอนทั้งหมดของนิยาย
	http.HandleFunc("GET /novels/{id}/chapters", middleware.RequestLogger(http.HandlerFunc(handlers.GetChaptersByNovelHandler(chapter))).ServeHTTP)

	// ดึงคอมเมนต์ของนิยาย
	http.HandleFunc("GET /novels/{id}/comments", middleware.RequestLogger(http.HandlerFunc(handlers.GetCommentsByNovelHandler(social))).ServeHTTP)

	// ดึงฉากทั้งหมดในตอน
	http.HandleFunc("GET /chapters/{id}/scenes", middleware.RequestLogger(http.HandlerFunc(handlers.GetScenesByChapterHandler(scene))).ServeHTTP)

	// ดึงคอมเมนต์ของฉาก
	http.HandleFunc("GET /scenes/{id}/comments", middleware.RequestLogger(http.HandlerFunc(handlers.GetCommentsBySceneHandler(social))).ServeHTTP)

	// ---------------------------------------------------------------------

	// Chapter & Scene (Create)
	http.HandleFunc("POST /chapters", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateChapterHandler(chapter)(w, r)
	})).ServeHTTP)

	http.HandleFunc("POST /scenes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateSceneHandler(scene)(w, r)
	})).ServeHTTP)

	http.HandleFunc("POST /choices", middleware.RequestLogger(http.HandlerFunc(handlers.CreateChoiceHandler(scene))).ServeHTTP)

	// Social Endpoints
	http.HandleFunc("POST /likes", middleware.RequestLogger(http.HandlerFunc(handlers.AddLikeHandler(social))).ServeHTTP)

	http.HandleFunc("POST /comments", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.AddCommentHandler(social)(w, r)
	})).ServeHTTP)

	http.HandleFunc("POST /follows", middleware.RequestLogger(http.HandlerFunc(handlers.AddFollowHandler(social))).ServeHTTP)

	// Reading Endpoints
	http.HandleFunc("POST /progress", middleware.RequestLogger(http.HandlerFunc(handlers.ProgressHandler(reading))).ServeHTTP)
	http.HandleFunc("POST /choice-history", middleware.RequestLogger(http.HandlerFunc(handlers.RecordChoiceHistoryHandler(reading))).ServeHTTP)

	// Reader & Writer Endpoints
	http.HandleFunc("GET /reader/scenes/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetSceneHandler(scene))).ServeHTTP)
	http.HandleFunc("GET /writer/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetWriterDetailHandler(writer))).ServeHTTP)

	// Media Endpoints
	http.HandleFunc("POST /upload", middleware.RequestLogger(http.HandlerFunc(handlers.UploadImageHandler(media))).ServeHTTP)
}