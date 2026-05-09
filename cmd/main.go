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

	// Ensure MinIO bucket exists
	ctx := context.Background()
	if err := mediaRepo.EnsureBucketExists(ctx, "novels-images"); err != nil {
		log.Fatalf("❌ failed to ensure MinIO bucket: %v", err)
	}
	fmt.Println("✅ MinIO Bucket Ready")

	// -----------------------
	// 5. Services
	// -----------------------
	novelService := service.NewNovelService(novelRepo)
	sceneService := service.NewSceneService(sceneRepo, dbConn)
	chapterService := service.NewChapterService(chapterRepo)
	socialService := service.NewSocialService(socialRepo)
	readingService := service.NewReadingService(readingRepo)
	flowService := service.NewFlowService(sceneService)
	writerService := service.NewWriterService(dbConn)
	mediaService := service.NewMediaService(mediaRepo)
	categoryService := service.NewCategoryService(categoryRepo)

	// -----------------------
	// 6. Routes
	// -----------------------
	routes.RegisterRoutes(flowService, novelService, chapterService, sceneService, socialService, readingService, writerService, mediaService, categoryService)

	// -----------------------
	// 7. Start Server
	// -----------------------
	fmt.Printf("🚀 Server running on port %s\n", cfg.AppPort)
	fmt.Println("📚 Novel Interactive Platform Backend Ready!")	

	handler := middleware.CORSMiddleware(http.DefaultServeMux)
	err = http.ListenAndServe(":"+cfg.AppPort, handler)
	if err != nil {
		log.Fatalf("❌ server start fail: %v", err)
	}
}
