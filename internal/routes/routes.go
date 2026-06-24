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
	auth service.AuthService,
) {
	// ประกาศตัวด่านหน้าสำหรับ Authen และ ระบบคำขอนักเขียน
	authHandler := handlers.NewAuthHandler(&auth, media)
	writerHandler := handlers.NewWriterHandler(writer, media)

	// ------------------------------------------
	// 🟢 Health & Authen Endpoints
	// ------------------------------------------
	mux.Handle("/health", middleware.RequestLogger(handlers.HealthCheck(scene)))
	mux.Handle("/", middleware.RequestLogger(handlers.GetRoot(flow)))

	// ผูกลิงก์สมัครสมาชิกกับล็อกอินออกจากระบบเข้าท่อหลัก
	mux.Handle("/api/register", middleware.RequestLogger(http.HandlerFunc(authHandler.Register)))
	mux.Handle("/api/login", middleware.RequestLogger(http.HandlerFunc(authHandler.Login)))
	mux.Handle("/api/logout", middleware.RequestLogger(http.HandlerFunc(authHandler.Logout)))

	// ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้องมี Token ที่ถูกต้อง)
	mux.Handle("/api/users", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(authHandler.GetUserInfo))))

	// 🟢 ดึงนิยายที่ผู้ใช้เขียน (ต้องมี Token ที่ถูกต้อง)
	mux.Handle("/api/me/novels", middleware.RequestLogger(middleware.RequireAuth(handlers.GetMyNovelsHandler(novel, writer))))

	// POST /novels ต้องมีการยืนยันสิทธิ์ ก่อนสร้างนิยาย
	mux.Handle("/novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			middleware.RequireAuth(handlers.NovelsHandler(novel, writer)).ServeHTTP(w, r)
			return
		}
		handlers.NovelsHandler(novel, writer)(w, r)
	})))

	// Legacy alias for Writer Dashboard delete route
	mux.Handle("/api/v1/writer/novels/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteNovelHandler(novel, writer))).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// ------------------------------------------
	// 🎀 โซนระบบคำขอสมัครเป็นนักเขียน (Writers & Admin Flow)
	// ------------------------------------------
	// ✍️ ท่อฝั่งคนอ่าน: ส่งใบสมัครเข้ามาในระบบ (เริ่มต้นสถานะ pending)
	mux.Handle("/api/writers/apply", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(writerHandler.Apply))))
	mux.Handle("/api/writers/me", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(writerHandler.GetApplicationStatus))))

	// 👑 ท่อฝั่งแอดมิน: ดึงใบสมัครทั้งหมดที่ค้างท่ออยู่มาตรวจสอบ
	mux.Handle("/api/admin/writers/requests", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.GetPendingRequests))))

	// 👑 ท่อฝั่งแอดมิน: กดอนุมัติ/ปฏิเสธ อัปเกรดฐานะคำขอให้กลายเป็นนักเขียน
	mux.Handle("/api/admin/writers/approve", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.Approve))))
	mux.Handle("/api/admin/writers/reject", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.Reject)))) // ------------------------------------------
	// 🟢 กลุ่มแยกย่อยตาม Resource
	// ------------------------------------------
	mux.Handle("/categories", middleware.RequestLogger(handlers.GetAllCategoriesHandler(category)))
	mux.Handle("/novels/", middleware.RequestLogger(http.HandlerFunc(novelSubRouter(novel, scene, chapter, social, writer, reading))))

	// 🔒 POST /chapters ต้องมีการยืนยันตัวตนผู้ใช้ (JWT Token)
	mux.Handle("/chapters", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/chapters" && r.Method == http.MethodPost {
			// ครอบด้วย RequireAuth เพื่อตรวจสอบ Token และถอดสิทธิ์ผู้ใช้
			middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handlers.CreateChapterHandler(chapter)(w, r)
			})).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// 📖 GET /chapters/:id/scenes เปิดอ่านได้ทั่วไป (ไม่ต้องครอบด้วย RequireAuth)
	mux.Handle("/chapters/", middleware.RequestLogger(http.HandlerFunc(chapterSubRouter(scene, chapter))))

	// 🔒 POST /scenes ต้องมีการยืนยันตัวตนผู้ใช้ (JWT Token)
	mux.Handle("/scenes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/scenes" && r.Method == http.MethodPost {
			// ครอบด้วย RequireAuth เพื่อตรวจสอบ Token และถอดสิทธิ์ผู้ใช้
			middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handlers.CreateSceneHandler(scene)(w, r)
			})).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// 📖 GET /scenes/:id เปิดอ่านได้ทั่วไป (ไม่ต้องครอบด้วย RequireAuth)
	mux.Handle("/scenes/", middleware.RequestLogger(http.HandlerFunc(sceneSubRouter(scene, social))))

	mux.Handle("/choices", middleware.RequestLogger(middleware.RequireAuth(handlers.CreateChoiceHandler(scene))))
	mux.Handle("/choices/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateChoiceHandler(scene))).ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteChoiceHandler(scene))).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// ------------------------------------------
	// 🟢 Reading Flow & Social (คุมพฤติกรรม)
	// ------------------------------------------
	mux.Handle("/progress", middleware.RequestLogger(middleware.RequireAuth(handlers.ProgressHandler(reading))))
	mux.Handle("/choice-history", middleware.RequestLogger(middleware.RequireAuth(handlers.RecordChoiceHistoryHandler(reading))))
	mux.Handle("/user-endings", middleware.RequestLogger(middleware.RequireAuth(handlers.RecordUserEndingHandler(reading))))
	mux.Handle("/likes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			middleware.RequireAuth(handlers.RemoveLikeHandler(social)).ServeHTTP(w, r)
			return
		}
		middleware.RequireAuth(handlers.AddLikeHandler(social)).ServeHTTP(w, r)
	})))
	mux.Handle("/comments", middleware.RequestLogger(middleware.RequireAuth(handlers.AddCommentHandler(social))))
	mux.Handle("/follows", middleware.RequestLogger(middleware.RequireAuth(handlers.AddFollowHandler(social))))

	mux.Handle("/writer/", middleware.RequestLogger(http.HandlerFunc(writerSubRouter(writer))))
	mux.Handle("/upload/image", middleware.RequestLogger(middleware.RequireAuth(handlers.UploadImageHandler(media, novel))))
}

// =========================================================================
// 🛠️ Sub-Routers โซนทำความสะอาด สับเปลี่ยน Logic ออกมาข้างนอกเพื่อไม่ให้โค้ดหลักบวม
// =========================================================================

func novelSubRouter(novel service.NovelService, scene service.SceneService, chapter service.ChapterService, social service.SocialService, writer service.WriterService, reading service.ReadingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/novels/"), "/")

		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/chapters"):
			handlers.GetChaptersByNovelHandler(chapter, novel, writer)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsByNovelHandler(social)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/story-tree"):
			handlers.GetStoryTreeHandler(scene, novel, writer)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/start"):
			handlers.StartReadingHandler(scene)(w, r)
		case r.Method == http.MethodPost && strings.HasSuffix(path, "/restart"):
			middleware.RequireAuth(http.HandlerFunc(handlers.RestartStoryHandler(scene, reading))).ServeHTTP(w, r)
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateNovelHandler(novel, scene, writer))).ServeHTTP(w, r)
		case r.Method == http.MethodDelete && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteNovelHandler(novel, writer))).ServeHTTP(w, r)
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetNovelDetailHandler(novel, scene, social)(w, r)
		default:
			http.NotFound(w, r)
		}
	}
}

func chapterSubRouter(scene service.SceneService, chapter service.ChapterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/chapters/"), "/")
		switch {
		// 📖 GET /chapters/:id/scenes - อ่านได้ทั่วไป
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/scenes"):
			handlers.GetScenesByChapterHandler(scene)(w, r)
		// 🔒 PUT /chapters/:id - อัปเดตสถานะ/ชื่อบท
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateChapterHandler(chapter))).ServeHTTP(w, r)
		// 🔒 DELETE /chapters/:id - ลบตอน พร้อม RequireAuth
		case r.Method == http.MethodDelete && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteChapterHandler(chapter))).ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	}
}

func sceneSubRouter(scene service.SceneService, social service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/scenes/"), "/")
		switch {
		// 📖 GET /scenes/:id/comments - อ่านได้ทั่วไป
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsBySceneHandler(social)(w, r)
		// 📖 GET /scenes/:id - อ่านได้ทั่วไป
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetSceneHandler(scene)(w, r)
		// 🔒 PUT /scenes/:id - อัปเดตฉากนิยาย
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateSceneHandler(scene))).ServeHTTP(w, r)
			return
		// 🔒 DELETE /scenes/:id - ลบฉากนิยาย
		case r.Method == http.MethodDelete && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteSceneHandler(scene))).ServeHTTP(w, r)
			return
		default:
			http.NotFound(w, r)
		}
	}
}

func writerSubRouter(writer service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/writer/"), "/")
		if r.Method == http.MethodGet && isNumericIDPath(path) {
			handlers.GetWriterDetailHandler(writer)(w, r)
			return
		}
		http.NotFound(w, r)
	}
}

func isNumericIDPath(path string) bool {
	path = strings.Trim(path, "/")
	if path == "" || strings.Contains(path, "/") {
		return false
	}
	_, err := strconv.Atoi(path)
	return err == nil
}
