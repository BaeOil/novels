package routes

import (
	"net/http"

	"novel-be/internal/handlers"
	"novel-be/internal/middleware"
	"novel-be/internal/service"
)

func RegisterRoutes(
	mux *http.ServeMux,
	flow service.FlowService,
	novel service.NovelService,
	chapter service.ChapterService,
	scene service.SceneService,
	social service.SocialService,
	reading service.ReadingService,
	writer service.WriterService,
	media service.MediaService,
	category service.CategoryService,
) {
	// Health & Root
	mux.HandleFunc("GET /health", middleware.RequestLogger(http.HandlerFunc(handlers.HealthCheck(scene))).ServeHTTP)
	mux.HandleFunc("GET /", middleware.RequestLogger(http.HandlerFunc(handlers.GetRoot(flow))).ServeHTTP)

	// ==========================================
	// 🟢 Category Endpoints
	// ==========================================
	mux.HandleFunc("GET /categories", middleware.RequestLogger(http.HandlerFunc(handlers.GetAllCategoriesHandler(category))).ServeHTTP)

	// Novel Endpoints (GET list, POST create)
	mux.HandleFunc("GET /novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.NovelsHandler(novel)(w, r)
	})).ServeHTTP)

	mux.HandleFunc("POST /novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.NovelsHandler(novel)(w, r)
	})).ServeHTTP)

	// ---------------------------------------------------------------------
	// 🟢 RESTful API (Path Parameters)
	// ---------------------------------------------------------------------

	// ดึงรายละเอียดนิยาย
	mux.HandleFunc("GET /novels/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetNovelDetailHandler(novel, scene))).ServeHTTP)

	// ดึงตอนทั้งหมดของนิยาย
	mux.HandleFunc("GET /novels/{id}/chapters", middleware.RequestLogger(http.HandlerFunc(handlers.GetChaptersByNovelHandler(chapter))).ServeHTTP)

	// ดึงคอมเมนต์ของนิยาย
	mux.HandleFunc("GET /novels/{id}/comments", middleware.RequestLogger(http.HandlerFunc(handlers.GetCommentsByNovelHandler(social))).ServeHTTP)

	// ดึงฉากทั้งหมดในตอน
	mux.HandleFunc("GET /chapters/{id}/scenes", middleware.RequestLogger(http.HandlerFunc(handlers.GetScenesByChapterHandler(scene))).ServeHTTP)

	// ดึงคอมเมนต์ของฉาก
	mux.HandleFunc("GET /scenes/{id}/comments", middleware.RequestLogger(http.HandlerFunc(handlers.GetCommentsBySceneHandler(social))).ServeHTTP)

	// ---------------------------------------------------------------------

	// Chapter & Scene (Create)
	mux.HandleFunc("POST /chapters", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateChapterHandler(chapter)(w, r)
	})).ServeHTTP)

	mux.HandleFunc("POST /scenes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateSceneHandler(scene)(w, r)
	})).ServeHTTP)

	mux.HandleFunc("POST /choices", middleware.RequestLogger(http.HandlerFunc(handlers.CreateChoiceHandler(scene))).ServeHTTP)

	// Social Endpoints
	mux.HandleFunc("POST /likes", middleware.RequestLogger(http.HandlerFunc(handlers.AddLikeHandler(social))).ServeHTTP)

	mux.HandleFunc("POST /comments", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlers.AddCommentHandler(social)(w, r)
	})).ServeHTTP)

	mux.HandleFunc("POST /follows", middleware.RequestLogger(http.HandlerFunc(handlers.AddFollowHandler(social))).ServeHTTP)

	// Reading Endpoints
	mux.HandleFunc("POST /progress", middleware.RequestLogger(http.HandlerFunc(handlers.ProgressHandler(reading))).ServeHTTP)
	mux.HandleFunc("POST /choice-history", middleware.RequestLogger(http.HandlerFunc(handlers.RecordChoiceHistoryHandler(reading))).ServeHTTP)
	mux.HandleFunc("GET /novels/{id}/start", middleware.RequestLogger(http.HandlerFunc(handlers.StartReadingHandler(scene))).ServeHTTP)

	// Reader & Writer Endpoints
	mux.HandleFunc("GET /reader/scenes/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetSceneHandler(scene))).ServeHTTP)
	mux.HandleFunc("GET /writer/{id}", middleware.RequestLogger(http.HandlerFunc(handlers.GetWriterDetailHandler(writer))).ServeHTTP)

	// ==========================================
	// 🟢 Media Endpoints (แก้ไขให้ส่ง novelService เข้าไป)
	// ==========================================
	mux.HandleFunc("POST /upload/image", middleware.RequestLogger(http.HandlerFunc(handlers.UploadImageHandler(media, novel))).ServeHTTP)
}