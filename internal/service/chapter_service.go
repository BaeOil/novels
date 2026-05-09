package service

import (
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type chapterService struct {
	repo repository.ChapterRepository
}

func NewChapterService(repo repository.ChapterRepository) ChapterService {
	return &chapterService{repo: repo}
}

func (s *chapterService) GetChaptersByNovelID(novelID int) ([]models.Chapter, error) {
	return s.repo.GetChaptersByNovelID(novelID)
}

func (s *chapterService) GetChapterByID(id int) (*models.Chapter, error) {
	return s.repo.GetChapterByID(id)
}

func (s *chapterService) CreateChapter(chapter models.Chapter) (int, error) {
	return s.repo.CreateChapter(chapter)
}
