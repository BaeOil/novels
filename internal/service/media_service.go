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
	NovelImagesBucket = "novels-images"
	MaxFileSize       = 10 * 1024 * 1024 // 10MB
)

type mediaService struct {
	mediaRepo repository.MediaRepository
}

// NewMediaService creates a new media service
func NewMediaService(mediaRepo repository.MediaRepository) MediaService {
	return &mediaService{
		mediaRepo: mediaRepo,
	}
}

// UploadImage uploads an image to MinIO
func (s *mediaService) UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error) {
	// Validate file size
	if file.Size > MaxFileSize {
		return "", fmt.Errorf("file size exceeds maximum limit of 10MB")
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Get file extension
	ext := filepath.Ext(file.Filename)
	if !isAllowedImageType(ext) {
		return "", fmt.Errorf("file type not allowed. allowed types: jpg, jpeg, png, gif, webp")
	}

	// Create unique filename
	objectName := fmt.Sprintf("uploads/%d-%s", time.Now().Unix(), file.Filename)

	// Ensure bucket exists
	if err := s.mediaRepo.EnsureBucketExists(ctx, NovelImagesBucket); err != nil {
		return "", fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	// Get content type
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Upload file
	url, err := s.mediaRepo.UploadFile(ctx, NovelImagesBucket, objectName, src, file.Size, contentType)
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return url, nil
}

// DeleteImage deletes an image from MinIO
func (s *mediaService) DeleteImage(ctx context.Context, filename string) error {
	return s.mediaRepo.DeleteFile(ctx, NovelImagesBucket, filename)
}

// GetPresignedURL returns a presigned URL for a file
func (s *mediaService) GetPresignedURL(ctx context.Context, filename string) (string, error) {
	return s.mediaRepo.GetPresignedURL(ctx, NovelImagesBucket, filename)
}

// Helper functions
func isAllowedImageType(ext string) bool {
	allowed := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	return allowed[ext]
}
