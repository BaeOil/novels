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
	notificationService service.NotificationService,
	reportService service.ReportService,
	analytics service.AnalyticsService,
) {
	// ประกาศตัวด่านหน้าสำหรับ Authen และ ระบบคำขอนักเขียน
	authHandler := handlers.NewAuthHandler(&auth, media)
	writerHandler := handlers.NewWriterHandler(writer, media, notificationService)
	adminUserHandler := handlers.NewAdminUserHandler(auth)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	reportHandler := handlers.NewReportHandler(reportService)

	// ------------------------------------------
	// 🟢 Health & Authen Endpoints
	// ------------------------------------------
	mux.Handle("/health", middleware.RequestLogger(handlers.HealthCheck(scene)))
	mux.Handle("/", middleware.RequestLogger(handlers.GetRoot(flow)))

	// ผูกลิงก์สมัครสมาชิกกับล็อกอินออกจากระบบเข้าท่อหลัก
	mux.Handle("/api/register", middleware.RequestLogger(http.HandlerFunc(authHandler.Register)))
	mux.Handle("/api/login", middleware.RequestLogger(http.HandlerFunc(authHandler.Login)))
	mux.Handle("/api/refresh", middleware.RequestLogger(http.HandlerFunc(authHandler.Refresh)))
	mux.Handle("/api/logout", middleware.RequestLogger(http.HandlerFunc(authHandler.Logout)))

	// ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้องมี Token ที่ถูกต้อง)
	mux.Handle("/api/users", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(authHandler.GetUserInfo))))

	// 🟢 แก้ไขชื่อผู้ใช้ (Username) ของตัวเอง
	updateOwnUsernameHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			authHandler.UpdateOwnUsername(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/username", updateOwnUsernameHandler)
	mux.Handle("/me/username", updateOwnUsernameHandler)

	// 🟢 แก้ไขอีเมล (Email) ของตัวเอง
	updateOwnEmailHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			authHandler.UpdateOwnEmail(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/email", updateOwnEmailHandler)
	mux.Handle("/me/email", updateOwnEmailHandler)

	// 🟢 แก้ไขรหัสผ่าน (Password) ของตัวเอง
	updateOwnPasswordHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			authHandler.UpdateOwnPassword(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/password", updateOwnPasswordHandler)
	mux.Handle("/me/password", updateOwnPasswordHandler)

	// 🟢 แก้ไขรูปโปรไฟล์ (Profile Picture) ของตัวเอง
	updateOwnProfilePictureHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch || r.Method == http.MethodPut {
			authHandler.UpdateOwnProfilePicture(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/profile-picture", updateOwnProfilePictureHandler)
	mux.Handle("/me/profile-picture", updateOwnProfilePictureHandler)

	// 🟢 ลบบัญชีผู้ใช้ (Delete Account) ของตัวเอง
	deleteOwnAccountHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			authHandler.DeleteOwnAccount(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me", deleteOwnAccountHandler)
	mux.Handle("/me", deleteOwnAccountHandler)

	// 🟢 พักบัญชีผู้ใช้ (Suspend Account) ของตัวเอง
	suspendOwnAccountHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			authHandler.SuspendOwnAccount(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/suspend", suspendOwnAccountHandler)
	mux.Handle("/me/suspend", suspendOwnAccountHandler)

	// 🟢 การตั้งค่าแจ้งเตือน (Notification Settings) ของตัวเอง
	notificationSettingsHandler := middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			notificationHandler.GetSettings(w, r)
			return
		}
		if r.Method == http.MethodPatch || r.Method == http.MethodPut {
			notificationHandler.UpdateSettings(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	mux.Handle("/api/me/notification-settings", notificationSettingsHandler)
	mux.Handle("/me/notification-settings", notificationSettingsHandler)

	// 🟢 ดึงนิยายที่ผู้ใช้เขียน (ต้องมี Token ที่ถูกต้อง)
	mux.Handle("/api/me/novels", middleware.RequestLogger(middleware.RequireAuth(handlers.GetMyNovelsHandler(novel, writer))))

	// POST /novels ต้องมีการยืนยันสิทธิ์ ก่อนสร้างนิยาย
	mux.Handle("/novels", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			middleware.RequireAuth(handlers.NovelsHandler(novel, writer, notificationService)).ServeHTTP(w, r)
			return
		}
		handlers.NovelsHandler(novel, writer, notificationService)(w, r)
	})))

	// 🚨 ท่อฝั่งคนอ่าน: ส่งรายงานนิยาย (บังคับล็อกอินถึงจะรายงานได้)
	mux.Handle("/api/reports", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(reportHandler.CreateReport))))

	// 🟢 ท่อฝั่งนักเขียน: ยื่นเรื่องขอปลดแบนนิยาย (บังคับล็อกอินถึงจะยื่นเรื่องได้)
	mux.Handle("/api/writer/novels/appeal", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(reportHandler.CreateAppeal))))

	// 🟢 ท่อฝั่งนักเขียน: ดึงสถิตินิยาย (GET /api/v1/writer/novels/:id/analytics & GET /api/v1/writer/novels/:id/analytics/scenes/:sceneId)
	mux.Handle("/api/v1/writer/novels/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteNovelHandler(novel, writer))).ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodGet {
			if strings.HasSuffix(r.URL.Path, "/choices") && strings.Contains(r.URL.Path, "/analytics/scenes/") {
				middleware.RequireAuth(handlers.SceneChoiceAnalyticsHandler(analytics, novel, writer)).ServeHTTP(w, r)
				return
			}
			if strings.Contains(r.URL.Path, "/analytics/scenes/") {
				middleware.RequireAuth(handlers.SceneAnalyticsHandler(analytics, novel, writer)).ServeHTTP(w, r)
				return
			}
			if strings.HasSuffix(r.URL.Path, "/analytics") {
				middleware.RequireAuth(handlers.NovelAnalyticsHandler(analytics, novel, writer)).ServeHTTP(w, r)
				return
			}
		}
		http.NotFound(w, r)
	})))

	// ------------------------------------------
	// 🎀 โซนระบบคำขอสมัครเป็นนักเขียน (Writers & Admin Flow)
	// ------------------------------------------
	// ✍️ ท่อฝั่งคนอ่าน: ส่งใบสมัครเข้ามาในระบบ (เริ่มต้นสถานะ pending)
	mux.Handle("/api/writers/apply", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(writerHandler.Apply))))
	mux.Handle("/api/writers/me", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(writerHandler.GetApplicationStatus))))
	mux.Handle("/api/writers/me/profile", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(writerHandler.UpdateProfile))))

	// 👑 ท่อฝั่งแอดมิน: ดึงใบสมัครทั้งหมดที่ค้างท่ออยู่มาตรวจสอบ
	mux.Handle("/api/admin/writers/requests", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.GetPendingRequests))))

	// 👑 ท่อฝั่งแอดมิน: กดอนุมัติ/ปฏิเสธ อัปเกรดฐานะคำขอให้กลายเป็นนักเขียน
	mux.Handle("/api/admin/writers/approve", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.Approve))))
	mux.Handle("/api/admin/writers/reject", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(writerHandler.Reject))))

	// 👑 ท่อฝั่งแอดมิน: ระบบจัดการผู้ใช้
	adminUsersSubRouter := middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/username"):
			if r.Method == http.MethodPatch {
				adminUserHandler.AdminUpdateUsername(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		case strings.HasSuffix(r.URL.Path, "/status"):
			adminUserHandler.UpdateUserStatus(w, r)
		case strings.HasSuffix(r.URL.Path, "/demote"):
			adminUserHandler.DemoteUser(w, r)
		case r.Method == http.MethodDelete:
			adminUserHandler.DeleteUser(w, r)
		default:
			adminUserHandler.GetUserDetail(w, r)
		}
	})))
	mux.Handle("/api/admin/users", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(adminUserHandler.ListUsers))))
	mux.Handle("/api/admin/users/", adminUsersSubRouter)
	mux.Handle("/admin/users/", adminUsersSubRouter)

	// 👑 ท่อฝั่งแอดมิน: ระบบจัดการรายงานนิยาย
	// GET /api/admin/reports -> ดึงรายการรีพอร์ตทั้งหมด
	mux.Handle("/api/admin/reports", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(reportHandler.GetPendingReports))))

	// PATCH /api/admin/reports/:id/status -> อัปเดตสถานะรีพอร์ต
	mux.Handle("/api/admin/reports/", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(reportHandler.UpdateReportStatus))))

	// 👑 ท่อฝั่งแอดมิน: ระบบจัดการหมวดหมู่นิยาย
	adminCategoriesSubRouter := middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPatch:
			handlers.AdminUpdateCategoryHandler(category)(w, r)
		case http.MethodDelete:
			handlers.AdminDeleteCategoryHandler(category)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/admin/categories", middleware.RequestLogger(middleware.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlers.AdminCreateCategoryHandler(category)(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))))
	mux.Handle("/api/admin/categories/", adminCategoriesSubRouter)

	// 🟢 กลุ่มแยกย่อยตาม Resource
	// ------------------------------------------
	mux.Handle("/categories", middleware.RequestLogger(handlers.GetAllCategoriesHandler(category)))

	mux.Handle("/novels/", middleware.RequestLogger(middleware.OptionalAuth(http.HandlerFunc(novelSubRouter(novel, scene, chapter, social, writer, reading, notificationService)))))

	// 🔒 POST /chapters ต้องมีการยืนยันตัวตนผู้ใช้ (JWT Token)
	mux.Handle("/chapters", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/chapters" && r.Method == http.MethodPost {
			// ครอบด้วย RequireAuth เพื่อตรวจสอบ Token และถอดสิทธิ์ผู้ใช้
			middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handlers.CreateChapterHandler(chapter, notificationService)(w, r)
			})).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// 📖 GET /chapters/:id/scenes เปิดอ่านได้ทั่วไป (แต่ใช้ OptionalAuth เผื่อมี Token ของผู้ใช้/นักเขียน)
	mux.Handle("/chapters/", middleware.RequestLogger(middleware.OptionalAuth(http.HandlerFunc(chapterSubRouter(scene, chapter, novel, writer)))))

	// 🔒 POST /scenes ต้องมีการยืนยันตัวตนผู้ใช้ (JWT Token)
	mux.Handle("/scenes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/scenes" && r.Method == http.MethodPost {
			// ครอบด้วย RequireAuth เพื่อตรวจสอบ Token และถอดสิทธิ์ผู้ใช้
			middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handlers.CreateSceneHandler(scene, notificationService)(w, r)
			})).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// 📖 GET /scenes/:id เปิดอ่านได้ทั่วไป (แต่ใช้ OptionalAuth เผื่อมี Token ของผู้ใช้/นักเขียน)
	mux.Handle("/scenes/", middleware.RequestLogger(middleware.OptionalAuth(http.HandlerFunc(sceneSubRouter(scene, novel, writer, chapter, social, notificationService)))))

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
	mux.Handle("/progress", middleware.RequestLogger(middleware.RequireAdminReadOnly(handlers.ProgressHandler(reading, novel, writer))))
	mux.Handle("/history", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetReadingHistoryHandler(reading)(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			handlers.DeleteReadingHistoryBulkHandler(reading)(w, r)
			return
		}
		http.NotFound(w, r)
	}))))
	mux.Handle("/history/", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handlers.DeleteReadingHistoryByNovelHandler(reading)(w, r)
			return
		}
		http.NotFound(w, r)
	}))))
	mux.Handle("/choice-history", middleware.RequestLogger(middleware.RequireAuth(handlers.RecordChoiceHistoryHandler(reading, scene, novel, writer, chapter))))
	mux.Handle("/user-endings", middleware.RequestLogger(middleware.RequireAuth(handlers.RecordUserEndingHandler(reading, novel, writer))))
	mux.Handle("/likes", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			middleware.RequireAdminReadOnly(handlers.RemoveLikeHandler(social, notificationService)).ServeHTTP(w, r)
			return
		}
		middleware.RequireAdminReadOnly(handlers.AddLikeHandler(social, notificationService)).ServeHTTP(w, r)
	})))
	mux.Handle("/bookshelves", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			if r.URL.Query().Get("novel_id") != "" {
				handlers.GetBookshelfCountHandler(social)(w, r)
				return
			}
			handlers.GetBookshelfHandler(social)(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			middleware.RequireNotAdmin(handlers.RemoveFromBookshelfHandler(social)).ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodPost {
			middleware.RequireNotAdmin(handlers.AddToBookshelfHandler(social)).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))
	mux.Handle("/comments", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			middleware.RequireNotAdmin(handlers.RemoveCommentHandler(social)).ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodPost {
			middleware.RequireNotAdmin(handlers.AddCommentHandler(social, notificationService)).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))
	mux.Handle("/follows", middleware.RequestLogger(middleware.RequireAdminReadOnly(handlers.AddFollowHandler(social, notificationService))))
	mux.Handle("/api/users/following-writers", middleware.RequestLogger(middleware.RequireAuth(handlers.GetFollowingWritersHandler(social))))
	mux.Handle("/api/me/following-writers", middleware.RequestLogger(middleware.RequireAuth(handlers.GetFollowingWritersHandler(social))))
	mux.Handle("/api/writers/", middleware.RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/follow") {
			middleware.RequireNotAdmin(handlers.FollowWriterHandler(social, notificationService)).ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/unfollow") {
			middleware.RequireNotAdmin(handlers.UnfollowWriterHandler(social)).ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	mux.Handle("/writer/", middleware.RequestLogger(http.HandlerFunc(writerSubRouter(writer, social))))
	mux.Handle("/upload/image", middleware.RequestLogger(middleware.RequireAuth(handlers.UploadImageHandler(media, novel))))

	notificationRoutes := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		prefix := "/api/notifications"
		if strings.HasPrefix(r.URL.Path, "/notifications") {
			prefix = "/notifications"
		}

		path := strings.TrimPrefix(r.URL.Path, prefix+"/")
		switch {
		case r.URL.Path == prefix && r.Method == http.MethodGet:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.List)).ServeHTTP(w, r)
		case r.URL.Path == prefix && r.Method == http.MethodPost:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.CreateFromPayload)).ServeHTTP(w, r)
		case r.URL.Path == prefix && r.Method == http.MethodDelete:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.DeleteAll)).ServeHTTP(w, r)
		case path == "unread-count" && r.Method == http.MethodGet:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.UnreadCount)).ServeHTTP(w, r)
		case path == "read-all" && r.Method == http.MethodPatch:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.MarkAllRead)).ServeHTTP(w, r)
		case strings.HasSuffix(path, "/read") && r.Method == http.MethodPatch:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.MarkRead)).ServeHTTP(w, r)
		case strings.HasSuffix(path, "/delete") && r.Method == http.MethodDelete:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.Delete)).ServeHTTP(w, r)
		case r.Method == http.MethodDelete:
			middleware.RequireAuth(http.HandlerFunc(notificationHandler.Delete)).ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})

	mux.Handle("/notifications/stream", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(notificationHandler.Stream))))
	mux.Handle("/api/notifications/stream", middleware.RequestLogger(middleware.RequireAuth(http.HandlerFunc(notificationHandler.Stream))))
	mux.Handle("/notifications", middleware.RequestLogger(notificationRoutes))
	mux.Handle("/notifications/", middleware.RequestLogger(notificationRoutes))
	mux.Handle("/api/notifications", middleware.RequestLogger(notificationRoutes))
	mux.Handle("/api/notifications/", middleware.RequestLogger(notificationRoutes))
}

// =========================================================================
// 🛠️ Sub-Routers โซนทำความสะอาด สับเปลี่ยน Logic ออกมาข้างนอกเพื่อไม่ให้โค้ดหลักบวม
// =========================================================================

func novelSubRouter(novel service.NovelService, scene service.SceneService, chapter service.ChapterService, social service.SocialService, writer service.WriterService, reading service.ReadingService, notificationService service.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/novels/"), "/")

		switch {
		case r.Method == http.MethodPut && strings.HasSuffix(path, "/chapters/reorder"):
			middleware.RequireAuth(http.HandlerFunc(handlers.ReorderChaptersHandler(chapter))).ServeHTTP(w, r)
			return
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/chapters"):
			handlers.GetChaptersByNovelHandler(chapter, novel, writer)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments/count"):
			handlers.GetCommentCountByNovelHandler(social)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsByNovelHandler(social)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/story-tree"):
			handlers.GetStoryTreeHandler(scene, novel, chapter, writer)(w, r)
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/start"):
			handlers.StartReadingHandler(scene, novel, writer, chapter)(w, r)
		case r.Method == http.MethodPost && strings.HasSuffix(path, "/restart"):
			middleware.RequireAuth(http.HandlerFunc(handlers.RestartStoryHandler(scene, reading, novel, chapter, writer))).ServeHTTP(w, r)
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateNovelHandler(novel, scene, writer, notificationService))).ServeHTTP(w, r)
		case r.Method == http.MethodDelete && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteNovelHandler(novel, writer))).ServeHTTP(w, r)
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetNovelDetailHandler(novel, scene, social, writer)(w, r)
		default:
			http.NotFound(w, r)
		}
	}
}

func chapterSubRouter(scene service.SceneService, chapter service.ChapterService, novel service.NovelService, writer service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/chapters/"), "/")
		switch {
		// 📖 GET /chapters/:id/scenes - อ่านได้ทั่วไป
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/scenes"):
			handlers.GetScenesByChapterHandler(scene, chapter, novel, writer)(w, r)
		// 🔒 PUT /chapters/:id - อัปเดตสถานะ/ชื่อบท
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateChapterHandler(chapter, scene))).ServeHTTP(w, r)
		// 🔒 DELETE /chapters/:id - ลบตอน พร้อม RequireAuth
		case r.Method == http.MethodDelete && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.DeleteChapterHandler(chapter))).ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	}
}

func sceneSubRouter(scene service.SceneService, novel service.NovelService, writer service.WriterService, chapter service.ChapterService, social service.SocialService, notificationService service.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/scenes/"), "/")
		switch {
		// 🔒 PUT /scenes/:id/position - อัปเดตพิกัด Node ใน Story Tree
		case r.Method == http.MethodPut && strings.HasSuffix(path, "/position"):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateScenePositionHandler(scene, novel, writer))).ServeHTTP(w, r)
			return
		// 📖 GET /scenes/:id/comments - อ่านได้ทั่วไป
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/comments"):
			handlers.GetCommentsBySceneHandler(social)(w, r)
		// 📖 GET /scenes/:id - ตรวจ 3 ระดับ published ถ้าไม่ใช่เจ้าของ/admin
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetSceneHandler(scene, chapter, novel, writer)(w, r)
		// 🔒 PUT /scenes/:id - อัปเดตฉากนิยาย
		case r.Method == http.MethodPut && isNumericIDPath(path):
			middleware.RequireAuth(http.HandlerFunc(handlers.UpdateSceneHandler(scene, notificationService))).ServeHTTP(w, r)
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

func writerSubRouter(writer service.WriterService, social service.SocialService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/writer/"), "/")
		switch {
		case r.Method == http.MethodGet && isNumericIDPath(path):
			handlers.GetWriterDetailHandler(writer)(w, r)
			return
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/bookshelf-counts"):
			handlers.GetWriterBookshelfCountsHandler(social)(w, r)
			return
		case r.Method == http.MethodGet && strings.HasSuffix(path, "/total-views"):
			handlers.GetWriterTotalViewsHandler(writer)(w, r)
			return
		default:
			http.NotFound(w, r)
		}
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
