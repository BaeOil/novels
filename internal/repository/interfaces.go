package repository

import (
	"context"
	"novel-be/internal/dto"
	"novel-be/internal/models"
)

type NovelRepository interface {
	ListNovels() ([]models.Novel, error)
	GetNovelByID(id int) (*models.Novel, error)
	IncrementViews(novelID int) error
	GetNovelsByAuthorID(authorID int) ([]models.Novel, error)
	CreateNovel(models.Novel) (int, error)
	UpdateNovel(models.Novel) error
	UpdateCoverImage(id int, url string) error
	DeleteNovel(id int) error
}

type SceneRepository interface {
	GetSceneByID(id int) (*models.Scene, error)
	GetStartSceneByNovelID(novelID int) (*models.Scene, error)
	GetChoicesBySceneID(id int) ([]models.Choice, error)
	GetChoiceByID(choiceID int) (*models.Choice, error)
	GetScenesByChapterID(chapterID int) ([]models.Scene, error)
	CreateScene(scene models.Scene) (int, error)
	UpdateScene(scene models.Scene) error
	DeleteScene(sceneID int) error
	CreateChoice(choice models.Choice) (int, error)
	UpdateChoice(choice models.Choice) error
	DeleteChoice(choiceID int) error
	CountScenesInNovel(novelID int) (int, error)
	CheckChoiceExists(fromID, toID int, label string) (bool, error)
	CheckSceneExists(chapterID int, title string) (bool, error)
	GetNodesByNovelID(novelID int) ([]models.SceneNode, error)
	GetNodesByNovelIDForUser(novelID int, userID int) ([]models.SceneNode, error)
	GetEdgesByNovelID(novelID int) ([]models.SceneEdge, error)
	GetEndingsByNovelIDForUser(novelID int, userID int) ([]models.EndingScene, error)
}

type ChapterRepository interface {
	GetChaptersByNovelID(novelID int) ([]models.Chapter, error)
	GetChapterByID(id int) (*models.Chapter, error)
	CreateChapter(models.Chapter) (int, error)
	UpdateChapter(models.Chapter) error
	DeleteChapter(chapterID int) error
}

type SocialRepository interface {
	AddLike(models.Like) error
	RemoveLike(userID, novelID int) error
	IsLikeExists(userID, novelID int) (bool, error)
	AddComment(models.Comment) (int, error)
	AddFollow(models.Follow) error
	GetCommentsByNovelID(novelID int) ([]models.Comment, error)
	GetCommentsBySceneID(sceneID int) ([]models.Comment, error)
}

type ReadingRepository interface {
	GetReadingProgress(userID, novelID int) (*models.ReadingProgress, error)
	SaveReadingProgress(userID, novelID, sceneID int) error
	ResetReadingProgress(userID, novelID int) error
	InsertSceneHistory(userID, sceneID int) error
	InsertChoiceHistory(history models.ChoiceHistory) error
	InsertUserEnding(userID, novelID, sceneID int) error
}

type WriterRepository interface {
	GetWriterByID(id int) (*models.Writer, error)
	GetWriterByUserID(userID int) (*models.Writer, error)
	GetLatestWriterApplicationByUserID(userID int) (*models.Writer, error)
	GetUserRoleByUserID(userID int) (string, error)
	Apply(ctx context.Context, userID uint, req dto.WriterApplyRequest, contactJSON string) error
	GetPendingRequests(ctx context.Context) ([]dto.WriterRequestResponse, error)
	ApproveWriter(ctx context.Context, writerID uint) error
	RejectWriter(ctx context.Context, writerID uint) error
}

type AuthRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, userID uint) (*models.User, error)
}
