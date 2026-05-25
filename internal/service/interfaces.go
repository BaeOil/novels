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
	GetNovelsByAuthorID(authorID int) ([]models.Novel, error)
	CreateNovel(models.Novel) (int, error)
	UpdateNovel(models.Novel) error
	UpdateNovelCover(id int, url string) error
	DeleteNovel(id int) error
}

type SceneService interface {
	GetScene(int) (models.SceneResponse, error)
	GetStartScene(int) (models.SceneResponse, error)
	GetScenesByChapterID(int) ([]models.Scene, error)
	CreateScene(models.Scene) (int, error)
	UpdateScene(models.Scene) error
	SyncSceneChoices(fromSceneID int, rawChoices []interface{}) error
	CreateChoice(models.Choice) (int, error)
	UpdateChoice(models.Choice) error
	DeleteChoice(choiceID int) error
	GetStoryTree(novelID int, userID int) (models.StoryTreeResponse, error)
	Ping() error
}

type ChapterService interface {
	GetChaptersByNovelID(novelID int) ([]models.Chapter, error)
	GetChapterByID(id int) (*models.Chapter, error)
	CreateChapter(models.Chapter) (int, error)
	UpdateChapter(models.Chapter) error
}

type SocialService interface {
	AddLike(models.Like) error
	AddComment(models.Comment) (int, error)
	AddFollow(models.Follow) error
	GetCommentsByNovelID(novelID int) ([]dto.CommentDetailDTO, error)
	GetCommentsBySceneID(sceneID int) ([]dto.CommentDetailDTO, error)
}

type ReadingService interface {
	GetProgress(userID, novelID int) (*models.ReadingProgress, error)
	SaveProgress(progress models.ReadingProgress) error
	RecordChoiceHistory(history models.ChoiceHistory) error
	RecordEnding(userID, novelID, sceneID int) error
}

type FlowService interface {
	GetScene(int) (models.SceneResponse, error)
	GetWelcome() string
}

type WriterService interface {
	GetWriterByID(id int) (*models.Writer, error)
	GetWriterByUserID(userID int) (*models.Writer, error)
	GetLatestWriterApplicationByUserID(userID int) (*models.Writer, error)
	ApplyForWriter(ctx context.Context, userID uint, req dto.WriterApplyRequest) error
	GetPendingRequests(ctx context.Context) ([]dto.WriterRequestResponse, error)
	ApproveWriter(ctx context.Context, writerID uint) error
	RejectWriter(ctx context.Context, writerID uint) error
}

type MediaService interface {
	UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error)
	DeleteImage(ctx context.Context, filename string) error
	GetPresignedURL(ctx context.Context, filename string) (string, error)
}
