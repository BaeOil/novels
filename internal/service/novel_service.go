package service

import (
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type novelService struct {
	repo repository.NovelRepository
}

func NewNovelService(repo repository.NovelRepository) NovelService {
	return &novelService{repo: repo}
}

func (s *novelService) ListNovels() ([]models.Novel, error) {
	return s.repo.ListNovels()
}

func (s *novelService) GetNovelDetail(id int) (interface{}, error) {
	novel, err := s.repo.GetNovelByID(id)
	if err != nil {
		return nil, err
	}
	return novel, nil
}

func (s *novelService) CreateNovel(novel models.Novel) (int, error) {
	return s.repo.CreateNovel(novel)
}
