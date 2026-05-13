package service

import (
	"context"
	"mime/multipart"
	"novel-be/internal/dto"
	"novel-be/internal/models"
)

type NovelService interface {
	ListNovels() ([]models.Novel, error)
	GetNovelDetail(id int) (interface{}, error)
	CreateNovel(models.Novel) (int, error)
	UpdateNovelCover(id int, url string) error
}

type SceneService interface {
	GetScene(int) (models.SceneResponse, error)
	GetStartScene(int) (models.SceneResponse, error)
	GetScenesByChapterID(int) ([]models.Scene, error)
	CreateScene(models.Scene) (int, error)
	CreateChoice(models.Choice) (int, error)
	Ping() error
}

type ChapterService interface {
	GetChaptersByNovelID(novelID int) ([]models.Chapter, error)
	GetChapterByID(id int) (*models.Chapter, error)
	CreateChapter(models.Chapter) (int, error)
}

type SocialService interface {
	AddLike(models.Like) error
	AddComment(models.Comment) (int, error)
	AddFollow(models.Follow) error
	GetCommentsByNovelID(novelID int) ([]dto.CommentDetailDTO, error)
	GetCommentsBySceneID(sceneID int) ([]dto.CommentDetailDTO, error)
}

type ReadingService interface {
	GetProgress(int, int) (*models.ReadingProgress, error)
	SaveProgress(models.ReadingProgress) error
	RecordChoiceHistory(models.ChoiceHistory) error
}

type FlowService interface {
	GetScene(int) (models.SceneResponse, error)
	GetWelcome() string
}

type WriterService interface {
	GetWriterByID(id int) (interface{}, error)
}

type MediaService interface {
	UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error)
	DeleteImage(ctx context.Context, filename string) error
	GetPresignedURL(ctx context.Context, filename string) (string, error)
}
