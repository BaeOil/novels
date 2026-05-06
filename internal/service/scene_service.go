package service

import (
	"database/sql"
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type SceneService struct {
	DB *sql.DB
}

func NewSceneService(db *sql.DB) *SceneService {
	return &SceneService{DB: db}
}

func (s *SceneService) GetScene(sceneID int) (models.SceneResponse, error) {

	scene, err := repository.GetSceneByID(s.DB, sceneID)
	if err != nil {
		return models.SceneResponse{}, err
	}

	choices, err := repository.GetChoicesBySceneID(s.DB, sceneID)
	if err != nil {
		return models.SceneResponse{}, err
	}

	// ✅ แปลงเป็น response
	response := models.SceneResponse{
		SceneID: scene.SceneID,
		Content: scene.Content,
		Type:    scene.Type,
		Choices: choices,
	}

	return response, nil
}