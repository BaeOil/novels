package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"novel-be/config"
	"novel-be/internal/db"
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
	// 4. Services
	// -----------------------
	novelService := service.NewNovelService(dbConn)
	sceneService := service.NewSceneService(dbConn)
	flowService := service.NewFlowService(sceneService) // ✅ FIX

	// -----------------------
	// 5. Routes
	// -----------------------

	routes.RegisterRoutes(flowService, novelService, sceneService)

	// -----------------------
	// 6. Start Server
	// -----------------------
	fmt.Printf("🚀 Server running on port %s\n", cfg.AppPort)

	err = http.ListenAndServe(":"+cfg.AppPort, nil)
	if err != nil {
		log.Fatalf("❌ server start fail: %v", err)
	}
}
