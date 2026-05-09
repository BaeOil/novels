package repository

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
)

// MediaRepository interface defines methods for file storage operations
type MediaRepository interface {
	EnsureBucketExists(ctx context.Context, bucketName string) error
	UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error)
	DownloadFile(ctx context.Context, bucketName, objectName string) (io.Reader, error)
	DeleteFile(ctx context.Context, bucketName, objectName string) error
	GetPresignedURL(ctx context.Context, bucketName, objectName string) (string, error)
}

// MinIOMediaRepository implements MediaRepository using MinIO
type MinIOMediaRepository struct {
	client   *minio.Client
	endpoint string
}

// NewMinIOMediaRepository creates a new MinIO media repository
func NewMinIOMediaRepository(client *minio.Client, endpoint string) MediaRepository {
	return &MinIOMediaRepository{
		client:   client,
		endpoint: endpoint,
	}
}

// EnsureBucketExists creates a bucket if it doesn't already exist
func (m *MinIOMediaRepository) EnsureBucketExists(ctx context.Context, bucketName string) error {
	exists, err := m.client.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err := m.client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	return nil
}

// UploadFile uploads a file to MinIO and returns the object URL
func (m *MinIOMediaRepository) UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error) {
	_, err := m.client.PutObject(ctx, bucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// Construct the URL
	url := fmt.Sprintf("http://%s/%s/%s", m.endpoint, bucketName, objectName)
	return url, nil
}

// DownloadFile downloads a file from MinIO
func (m *MinIOMediaRepository) DownloadFile(ctx context.Context, bucketName, objectName string) (io.Reader, error) {
	object, err := m.client.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return object, nil
}

// DeleteFile deletes a file from MinIO
func (m *MinIOMediaRepository) DeleteFile(ctx context.Context, bucketName, objectName string) error {
	err := m.client.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// GetPresignedURL generates a presigned URL for temporary access
func (m *MinIOMediaRepository) GetPresignedURL(ctx context.Context, bucketName, objectName string) (string, error) {
	presignedURL, err := m.client.PresignedGetObject(ctx, bucketName, objectName, 3600, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return presignedURL.String(), nil
}
