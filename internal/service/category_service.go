package service

import (
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type CategoryService interface {
	GetCategories() ([]models.Category, error)
}

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) GetCategories() ([]models.Category, error) {
	// เรียกใช้งาน Repository เพื่อดึงข้อมูล
	return s.repo.GetAllCategories()
}
