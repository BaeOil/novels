package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"novel-be/config"
	"novel-be/internal/db"
	"novel-be/internal/middleware"
	"novel-be/internal/repository"
	"novel-be/internal/routes"
	"novel-be/internal/service"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {

	// -----------------------
	// 1. Load Config
	// -----------------------
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("❌ load config fail: %v", err)
	}

	// -----------------------
	// 2. Connect DB
	// -----------------------
	dbConn, err := db.Open(cfg)
	if err != nil {
		log.Fatalf("❌ DB connect fail: %v", err)
	}
	defer dbConn.Close()

	if err := dbConn.Ping(); err != nil {
		log.Fatalf("❌ DB ping fail: %v", err)
	}
	fmt.Println("✅ DB Connected")

	// -----------------------
	// 3. Connect MinIO
	// -----------------------
	minioClient, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		log.Fatalf("❌ MinIO connect fail: %v", err)
	}

	_, err = minioClient.ListBuckets(context.Background())
	if err != nil {
		log.Fatalf("❌ MinIO ping fail: %v", err)
	}
	fmt.Println("✅ MinIO Connected")

	// -----------------------
	// 4. Repositories
	// -----------------------
	novelRepo := repository.NewNovelRepository(dbConn)
	sceneRepo := repository.NewSceneRepository(dbConn)
	chapterRepo := repository.NewChapterRepository(dbConn)
	socialRepo := repository.NewSocialRepository(dbConn)
	readingRepo := repository.NewReadingRepository(dbConn)
	mediaRepo := repository.NewMinIOMediaRepository(minioClient, cfg.MinIOEndpoint)
	categoryRepo := repository.NewCategoryRepository(dbConn)
	authRepo := repository.NewAuthRepository(dbConn)
	writerRepo := repository.NewWriterRepository(dbConn) // 👈 ผูกเชื่อมตารางสมัครนักเขียนเข้าฐานข้อมูลจริง
	reportRepo := repository.NewReportRepository(dbConn)

	// Ensure MinIO bucket exists
	ctx := context.Background()
	if err := mediaRepo.EnsureBucketExists(ctx, "novel-buckets"); err != nil {
		log.Fatalf("❌ failed to ensure MinIO bucket: %v", err)
	}
	fmt.Println("✅ MinIO Bucket Ready")

	// -----------------------
	// 5. Services
	// -----------------------
	// 🟢 ย้าย mediaService ขึ้นมาสร้างก่อน เพราะ novelService ต้องใช้งาน
	mediaService := service.NewMediaService(mediaRepo)

	// 🟢 ตอนนี้ส่ง mediaService เข้าไปได้แล้ว
	novelService := service.NewNovelService(novelRepo, mediaService)

	sceneService := service.NewSceneService(sceneRepo, dbConn)
	chapterService := service.NewChapterService(chapterRepo)
	socialService := service.NewSocialService(socialRepo)
	readingService := service.NewReadingService(readingRepo)
	flowService := service.NewFlowService(sceneService)
	categoryService := service.NewCategoryService(categoryRepo)

	// 🟢 สร้างบริการระบบคำขอสมัครนักเขียนแบบสิทธิ์รออนุมัติ
	writerService := service.NewWriterServiceDirect(writerRepo)

	// 🟢 สร้างบริการระบบ Authentication สมาชิกของแท้
	authService := service.NewAuthService(authRepo)
	notificationService := service.NewNotificationService(dbConn)
	reportService := service.NewReportService(reportRepo)

	// 🟢 Analytics Service
	analyticsRepo := repository.NewAnalyticsRepository(dbConn)
	analyticsService := service.NewAnalyticsService(analyticsRepo)

	// สร้าง ServeMux ใหม่
	mux := http.NewServeMux()

	// -----------------------
	// 6. Routes
	// -----------------------
	routes.RegisterRoutes(
		mux,
		flowService,
		novelService,
		chapterService,
		sceneService,
		socialService,
		readingService,
		writerService, // 👈 ส่งมอบบริการคำขอสมัครนักเขียนเข้าสู่กลุ่มเส้นทาง API
		mediaService,
		categoryService,
		*authService, // 👈 ส่งบริการ Authen เข้าพ่วงท้ายแถวโดยใช้ * แกะ Pointer ออกตามโครงสร้างเดิม
		notificationService,
		reportService,
		analyticsService,
	)

	// -----------------------
	// 7. Start Server
	// -----------------------
	fmt.Printf("🚀 Server running on port %s\n", cfg.AppPort)
	fmt.Println("📚 Novel Interactive Platform Backend Ready!")

	handler := middleware.CORSMiddleware(mux) // 👈 ใช้ mux ที่เราสร้าง
	err = http.ListenAndServe(":"+cfg.AppPort, handler)
	if err != nil {
		log.Fatalf("❌ server start fail: %v", err)
	}
}
