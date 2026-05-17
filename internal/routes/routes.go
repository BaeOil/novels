package routes

import (
	"net/http"
	"strconv"
	"strings"

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
	mux.Handle("/health", middleware.RequestLogger(handlers.HealthCheck(scene)))
	mux.Handle("/", middleware.RequestLogger(handlers.GetRoot(flow)))

	// ==========================================
	// 🟢 Category Endpoints
	// ==========================================
	mux.Handle("/categories", middleware.RequestLogger(handlers.GetAllCategoriesHandler(category)))

	// ==========================================
	// 🟢 Novel Endpoints
	// ==========================================
	mux.Handle("/novels", middleware.RequestLogger(handlers.NovelsHandler(novel)))
	mux.Handle("/novels/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/novels/")
		path = strings.TrimSuffix(path, "/")

		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/chapters"):
			handlers.GetChaptersByNovelHandler(chapter)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsByNovelHandler(social)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/story-tree"):
			handlers.GetStoryTreeHandler(scene)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/start"):
			handlers.StartReadingHandler(scene)(w, r)
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetNovelDetailHandler(novel, scene)(w, r)
		default:
			http.NotFound(w, r)
		}
	})))

	// ==========================================
	// 🟢 Chapter & Scene Endpoints
	// ==========================================
	mux.Handle("/chapters", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/chapters" && r.Method == http.MethodPost {
			handlers.CreateChapterHandler(chapter)(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	mux.Handle("/chapters/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/chapters/")
		path = strings.TrimSuffix(path, "/")
		if r.Method == http.MethodGet && strings.HasSuffix(path, "/scenes") {
			handlers.GetScenesByChapterHandler(scene)(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	mux.Handle("/scenes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/scenes" && r.Method == http.MethodPost {
			handlers.CreateSceneHandler(scene)(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	mux.Handle("/scenes/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/scenes/")
		path = strings.TrimSuffix(path, "/")
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsBySceneHandler(social)(w, r)
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetSceneHandler(scene)(w, r)
		default:
			http.NotFound(w, r)
		}
	})))

	mux.Handle("/choices", middleware.RequestLogger(handlers.CreateChoiceHandler(scene)))

	// ==========================================
	// 🟢 Reading Flow (หน้าอ่านนิยาย)
	// ==========================================
	mux.Handle("/progress", middleware.RequestLogger(handlers.ProgressHandler(reading)))
	mux.Handle("/choice-history", middleware.RequestLogger(handlers.RecordChoiceHistoryHandler(reading)))

	// ==========================================
	// 🟢 Social & Writer Endpoints
	// ==========================================
	mux.Handle("/likes", middleware.RequestLogger(handlers.AddLikeHandler(social)))
	mux.Handle("/comments", middleware.RequestLogger(handlers.AddCommentHandler(social)))
	mux.Handle("/follows", middleware.RequestLogger(handlers.AddFollowHandler(social)))
	mux.Handle("/writer/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/writer/")
		path = strings.TrimSuffix(path, "/")
		if r.Method == http.MethodGet && isNumericIDPath(path) {
			handlers.GetWriterDetailHandler(writer)(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// Media Upload
	mux.Handle("/upload/image", middleware.RequestLogger(handlers.UploadImageHandler(media, novel)))
}

func isNumericIDPath(path string) bool {
	path = strings.Trim(path, "/")
	if path == "" {
		return false
	}
	if strings.Contains(path, "/") {
		return false
	}
	_, err := strconv.Atoi(path)
	return err == nil
}
