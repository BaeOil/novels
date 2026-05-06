package service

import "novel-be/internal/models"

type FlowService struct {
	Scene *SceneService
}

func NewFlowService(scene *SceneService) *FlowService {
	return &FlowService{Scene: scene}
}

// 👉 ใช้ SceneService แทน ไม่เขียน query ซ้ำ
func (f *FlowService) GetScene(sceneID int) (models.SceneResponse, error) {
	return f.Scene.GetScene(sceneID)
}

func (f *FlowService) GetWelcome() string {
	return "Welcome to Novel Reader API"
}
