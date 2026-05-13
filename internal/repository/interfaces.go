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
	GetReadingProgress(int, int) (*models.ReadingProgress, error)
	SaveReadingProgress(models.ReadingProgress) error
	InsertChoiceHistory(models.ChoiceHistory) error
}

type WriterRepository interface {
	GetWriterByID(id int) (*models.Writer, error)
}
