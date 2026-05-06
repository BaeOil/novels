package service

import (
    "database/sql"
    "novel-be/internal/models"
    "novel-be/internal/repository"
)

type NovelService struct {
    DB *sql.DB
}

func NewNovelService(db *sql.DB) *NovelService {
    return &NovelService{DB: db}
}

func (s *NovelService) ListNovels() ([]models.Novel, error) {
    return repository.GetNovels(s.DB)
}
