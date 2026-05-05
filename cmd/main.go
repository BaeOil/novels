package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"

	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	// เปลี่ยน "novel-be" เป็นชื่อ module ในไฟล์ go.mod ของหนูนะคะ
	"novel-be/config"
	"novel-be/internal/handlers"
)

func main() {
	// 1. โหลดการตั้งค่าจาก config.go (Viper)
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("❌ ไม่สามารถโหลด config ได้: %v", err)
	}

	// 2. เชื่อมต่อ Database โดยใช้ Connection String จาก config
	db, err := sql.Open("postgres", cfg.GetConnectionString())
	if err != nil {
		log.Fatalf("❌ เชื่อมต่อ Database ล้มเหลว: %v", err)
	}
	defer db.Close()

	// ตรวจสอบการเชื่อมต่อ (Ping)
	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Database ไม่ตอบสนอง (Ping fail): %v", err)
	}
	fmt.Println("✅ Connected to PostgreSQL successfully!")

	// 3. เชื่อมต่อ MinIO
	minioClient, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		log.Fatalf("❌ เชื่อมต่อ MinIO ล้มเหลว: %v", err)
	}

	// ทดสอบการเชื่อมต่อ MinIO
	_, err = minioClient.ListBuckets(context.Background())
	if err != nil {
		log.Fatalf("❌ MinIO ไม่ตอบสนอง: %v", err)
	}
	fmt.Println("✅ Connected to MinIO successfully!")
	// เรียกใช้ฟังก์ชันจาก internal/handlers
	http.HandleFunc("/novels", handlers.GetNovels(db))
	http.HandleFunc("/scene", handlers.GetScene(db))
	http.HandleFunc("/health", handlers.HealthCheck(db))

	// หน้าแรก (Root)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to Novel API! Try /novels or /scene?id=1")
	})

	// 4. เริ่มต้นรัน Server
	fmt.Printf("🚀 Server is running on port %s...\n", cfg.AppPort)
	err = http.ListenAndServe(":"+cfg.AppPort, nil)
	if err != nil {
		log.Fatalf("❌ ไม่สามารถเริ่มต้น Server ได้: %v", err)
	}
}
