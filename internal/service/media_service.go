package service

import (
	"context"
	"fmt"
	"mime/multipart"
	"novel-be/internal/repository"
	"path/filepath"
	"time"
)

const (
	NovelImagesBucket = "novel-buckets"
	MaxFileSize       = 10 * 1024 * 1024
)

type mediaService struct {
	mediaRepo repository.MediaRepository
}

func NewMediaService(mediaRepo repository.MediaRepository) MediaService {
	return &mediaService{
		mediaRepo: mediaRepo,
	}
}

func (s *mediaService) UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error) {
	if file.Size > MaxFileSize {
		return "", fmt.Errorf("file size exceeds 10MB")
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	ext := filepath.Ext(file.Filename)
	if !isAllowedImageType(ext) {
		return "", fmt.Errorf("invalid file type")
	}

	objectName := fmt.Sprintf("uploads/%d-%s", time.Now().Unix(), file.Filename)

	if err := s.mediaRepo.EnsureBucketExists(ctx, NovelImagesBucket); err != nil {
		return "", err
	}

	contentType := file.Header.Get("Content-Type")

	// 🟢 รับ URL เต็ม (http://minio:9000/...) มาส่งต่อ
	url, err := s.mediaRepo.UploadFile(ctx, NovelImagesBucket, objectName, src, file.Size, contentType)
	if err != nil {
		return "", err
	}

	return url, nil
}

func (s *mediaService) DeleteImage(ctx context.Context, filename string) error {
	return s.mediaRepo.DeleteFile(ctx, NovelImagesBucket, filename)
}

func (s *mediaService) GetPresignedURL(ctx context.Context, filename string) (string, error) {
	return s.mediaRepo.GetPresignedURL(ctx, NovelImagesBucket, filename)
}

func isAllowedImageType(ext string) bool {
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	return allowed[ext]
}
