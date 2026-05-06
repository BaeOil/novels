package models

type Choice struct {
    ChoiceID  int    `json:"choice_id"`
    Label     string `json:"label"`
    ToSceneID int    `json:"to_scene_id"`
}
