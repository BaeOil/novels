package repository

import (
	"novel-be/internal/models"
)

type NovelRepository interface {
	ListNovels() ([]models.Novel, error)
	GetNovelByID(id int) (*models.Novel, error)
	CreateNovel(models.Novel) (int, error)
	UpdateCoverImage(id int, url string) error
}

type SceneRepository interface {
	GetSceneByID(id int) (*models.Scene, error)
	GetStartSceneByNovelID(novelID int) (*models.Scene, error)
	GetChoicesBySceneID(id int) ([]models.Choice, error)
	GetScenesByChapterID(chapterID int) ([]models.Scene, error)
	CreateScene(scene models.Scene) (int, error)
	CreateChoice(choice models.Choice) (int, error)
	CountScenesInNovel(novelID int) (int, error)
	CheckChoiceExists(fromID, toID int, label string) (bool, error)
	CheckSceneExists(chapterID int, title string) (bool, error)
	GetNodesByNovelIDForUser(novelID int, userID int) ([]models.SceneNode, error)
	GetEdgesByNovelID(novelID int) ([]models.SceneEdge, error)
}

type ChapterRepository interface {
	GetChaptersByNovelID(novelID int) ([]models.Chapter, error)
	GetChapterByID(id int) (*models.Chapter, error)
	CreateChapter(models.Chapter) (int, error)
}

type SocialRepository interface {
	AddLike(models.Like) error
	AddComment(models.Comment) (int, error)
	AddFollow(models.Follow) error
	GetCommentsByNovelID(novelID int) ([]models.Comment, error)
	GetCommentsBySceneID(sceneID int) ([]models.Comment, error)
}

type ReadingRepository interface {
	GetReadingProgress(userID, novelID int) (*models.ReadingProgress, error)
	SaveReadingProgress(userID, novelID, sceneID int) error
	InsertSceneHistory(userID, sceneID int) error
	InsertChoiceHistory(history models.ChoiceHistory) error
}

type WriterRepository interface {
	GetWriterByID(id int) (*models.Writer, error)
}
