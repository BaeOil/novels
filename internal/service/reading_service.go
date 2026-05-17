package service

import (
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type readingService struct {
	repo repository.ReadingRepository
}

func NewReadingService(repo repository.ReadingRepository) ReadingService {
	return &readingService{repo: repo}
}

func (s *readingService) GetProgress(userID, novelID int) (*models.ReadingProgress, error) {
	return s.repo.GetReadingProgress(userID, novelID)
}

func (s *readingService) SaveProgress(progress models.ReadingProgress) error {
	return s.repo.SaveReadingProgress(progress.UserID, progress.NovelID, progress.CurrentSceneID)
}

func (s *readingService) RecordChoiceHistory(history models.ChoiceHistory) error {
	return s.repo.InsertChoiceHistory(history)
}
