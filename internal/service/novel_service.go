package service

import (
	"novel-be/internal/models"
	"novel-be/internal/repository"
	"strings"
)

type novelService struct {
	repo         repository.NovelRepository
	mediaService MediaService
}

func NewNovelService(repo repository.NovelRepository, mediaService MediaService) NovelService {
	return &novelService{
		repo:         repo,
		mediaService: mediaService,
	}
}

// 🟢 ปรับเพื่อให้หน้า Home ดึงรูปไปโชว์ได้
func (s *novelService) ListNovels() ([]models.Novel, error) {
	novels, err := s.repo.ListNovels()
	if err != nil {
		return nil, err
	}
	// ไม่ต้องทำอะไรเพิ่มที่นี่ เพราะเราไปจัดการ URL ที่ Frontend (HomePage.jsx) แล้ว
	return novels, nil
}

// 🟢 ปรับเพื่อให้หน้ารายละเอียดโชว์รูปได้
func (s *novelService) GetNovelDetail(id int) (interface{}, error) {
	return s.repo.GetNovelByID(id)
}

func (s *novelService) CreateNovel(novel models.Novel) (int, error) {
	return s.repo.CreateNovel(novel)
}

func (s *novelService) UpdateNovelCover(id int, url string) error {
	return s.repo.UpdateCoverImage(id, url)
}

// 🟢 ฟังก์ชันช่วยเช็ค (ถ้าไฟล์อื่นเรียกใช้)
func containsHTTP(s string) bool {
	return strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}
