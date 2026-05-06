package models

// ✅ ใช้กับ database
type Scene struct {
	SceneID int
	Title   string
	Content string
	Type    string
}

// ✅ ใช้ส่งให้ frontend
type SceneResponse struct {
	SceneID int      `json:"scene_id"`
	Content string   `json:"content"`
	Type    string   `json:"type"`
	Choices []Choice `json:"choices"`
}