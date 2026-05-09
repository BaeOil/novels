package models

// ✅ ใช้กับ database
type Scene struct {
	SceneID           int     `json:"scene_id"`
	ChapterID         int     `json:"chapter_id"`
	NovelID           int     `json:"novel_id"`
	Title             string  `json:"title"`
	Content           string  `json:"content"`
	Type              string  `json:"type"`
	EndingTitle       *string `json:"ending_title,omitempty"`
	EndingType        *string `json:"ending_type,omitempty"`
	EndingDescription *string `json:"ending_description,omitempty"`
}

// ✅ ใช้ส่งให้ frontend
type SceneResponse struct {
	SceneID int      `json:"scene_id"`
	Content string   `json:"content"`
	Type    string   `json:"type"`
	Choices []Choice `json:"choices"`
}
