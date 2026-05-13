package repository

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
)

type MediaRepository interface {
	EnsureBucketExists(ctx context.Context, bucketName string) error
	UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error)
	DownloadFile(ctx context.Context, bucketName, objectName string) (io.Reader, error)
	DeleteFile(ctx context.Context, bucketName, objectName string) error
	GetPresignedURL(ctx context.Context, bucketName, objectName string) (string, error)
}

type MinIOMediaRepository struct {
	client   *minio.Client
	endpoint string
}

func NewMinIOMediaRepository(client *minio.Client, endpoint string) MediaRepository {
	return &MinIOMediaRepository{
		client:   client,
		endpoint: endpoint,
	}
}

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

// 🟢 ส่วนนี้จะคืนค่า URL เต็มรูปแบบเพื่อบันทึกลง Database
func (m *MinIOMediaRepository) UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error) {
	_, err := m.client.PutObject(ctx, bucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// ใช้ชื่อเครื่อง minio:9000 ตามที่น้าต้องการ
	url := fmt.Sprintf("http://minio:9000/%s/%s", bucketName, objectName)
	return url, nil
}

func (m *MinIOMediaRepository) DownloadFile(ctx context.Context, bucketName, objectName string) (io.Reader, error) {
	object, err := m.client.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	return object, nil
}

func (m *MinIOMediaRepository) DeleteFile(ctx context.Context, bucketName, objectName string) error {
	err := m.client.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func (m *MinIOMediaRepository) GetPresignedURL(ctx context.Context, bucketName, objectName string) (string, error) {
	expiry := time.Hour * 24
	presignedURL, err := m.client.PresignedGetObject(ctx, bucketName, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return presignedURL.String(), nil
}
