package models

type Choice struct {
	ChoiceID    int    `json:"choice_id"`
	FromSceneID int    `json:"from_scene_id,omitempty"`
	Label       string `json:"label"`
	ToSceneID   int    `json:"to_scene_id"`
}
