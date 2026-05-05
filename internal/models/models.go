package models

type Novel struct {
	ID           int     `json:"novel_id"`
	Title        string  `json:"title"`
	Introduction *string `json:"introduction"`
}

type SceneResponse struct {
	SceneID int      `json:"scene_id"`
	Content string   `json:"content"`
	Type    string   `json:"type"`
	Choices []Choice `json:"choices"`
}

type Choice struct {
	ChoiceID  int    `json:"choice_id"`
	Label     string `json:"label"`
	ToSceneID int    `json:"to_scene_id"`
}
