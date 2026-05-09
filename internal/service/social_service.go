package service

import (
	"novel-be/internal/dto"
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type socialService struct {
	repo repository.SocialRepository
}

func NewSocialService(repo repository.SocialRepository) SocialService {
	return &socialService{repo: repo}
}

func (s *socialService) AddLike(like models.Like) error {
	return s.repo.AddLike(like)
}

func (s *socialService) AddComment(comment models.Comment) (int, error) {
	return s.repo.AddComment(comment)
}

func (s *socialService) AddFollow(follow models.Follow) error {
	return s.repo.AddFollow(follow)
}

func (s *socialService) GetCommentsByNovelID(novelID int) ([]dto.CommentDetailDTO, error) {
	comments, err := s.repo.GetCommentsByNovelID(novelID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.CommentDetailDTO, len(comments))
	for i, c := range comments {
		result[i] = dto.CommentDetailDTO{
			CommentID: c.CommentID,
			UserID:    c.UserID,
			Username:  c.Username,
			NovelID:   c.NovelID,
			SceneID:   c.SceneID,
			Content:   c.Content,
			CreatedAt: c.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}
	return result, nil
}

func (s *socialService) GetCommentsBySceneID(sceneID int) ([]dto.CommentDetailDTO, error) {
	comments, err := s.repo.GetCommentsBySceneID(sceneID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.CommentDetailDTO, len(comments))
	for i, c := range comments {
		result[i] = dto.CommentDetailDTO{
			CommentID: c.CommentID,
			UserID:    c.UserID,
			Username:  c.Username,
			NovelID:   c.NovelID,
			SceneID:   c.SceneID,
			Content:   c.Content,
			CreatedAt: c.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}
	return result, nil
}
