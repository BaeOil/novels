package models

// ✅ ใช้กับ database
type Scene struct {
	SceneID           int     `json:"scene_id"`
	ChapterID         int     `json:"chapter_id"`
	NovelID           int     `json:"novel_id"`
	Title             string  `json:"title"`
	Content           string  `json:"content"`
	ImageURL          string  `json:"image_url"`
	Type              string  `json:"type"`
	EndingTitle       *string `json:"ending_title,omitempty"`
	EndingType        *string `json:"ending_type,omitempty"`
	EndingDescription *string `json:"ending_description,omitempty"`
	NovelTitle        string  `json:"-"`
	ChapterTitle      string  `json:"-"`
}

// ✅ ใช้ส่งให้ frontend
type SceneResponse struct {
	SceneID           int      `json:"scene_id"`
	NovelTitle        string   `json:"novel_title"`
	ChapterTitle      string   `json:"chapter_title"`
	SceneTitle        string   `json:"scene_title"`
	Content           string   `json:"content"`
	Type              string   `json:"type"`
	ImageURL          string   `json:"image_url"`
	EndingTitle       *string  `json:"ending_title,omitempty"`
	EndingType        *string  `json:"ending_type,omitempty"`
	EndingDescription *string  `json:"ending_description,omitempty"`
	Choices           []Choice `json:"choices"`
}

type StoryTreeResponse struct {
	NovelTitle     string      `json:"novel_title"`      // 🎯 ส่งชื่อเรื่องนิยายมาในก้อนนี้ด้วย
	CurrentSceneID int         `json:"current_scene_id"` // ไอดีฉากปัจจุบันที่ผู้เล่นอ่านค้างอยู่
	Stats          TreeStats   `json:"stats"`
	Nodes          []SceneNode `json:"nodes"`
	Edges          []SceneEdge `json:"edges"`
}

type TreeStats struct {
    VisitedScenes     int `json:"visited_scenes"`      // จำนวนโหนดที่ is_unlocked = true
    TotalScenes       int `json:"total_scenes"`        // นับจำนวนโหนดทั้งหมดของนิยายเรื่องนี้
    DiscoveredChoices int `json:"discovered_choices"`  // จำนวนเส้นเชื่อม (Edges) ที่ผู้เล่นเคยเดินผ่าน
    TotalChoicePoints int `json:"total_choice_points"`  // นับจำนวนเส้นเชื่อมทั้งหมดที่มีในเรื่อง
    UnlockedEndings   int `json:"unlocked_endings"`    // จำนวนโหนดประเภท ending ที่เป็น true
    TotalEndings      int `json:"total_endings"`       // จำนวนโหนดประเภท ending ทั้งหมด
}

type SceneNode struct {
	ID         int    `json:"id"`
	Label      string `json:"label"`
	Title      string `json:"title"`   // 🎯 ชื่อตอน/หัวข้อฉากจริงๆ เช่น "พบหญิงสาวปริศนา"
	Content    string `json:"content"` // 🎯 เรื่องย่อท่อนสั้นๆ ประจำฉาก
	Type       string `json:"type"`
	IsUnlocked bool   `json:"is_unlocked"`
}

type SceneEdge struct {
	FromID int    `json:"from_id"`
	ToID   int    `json:"to_id"`
	Label  string `json:"label"`
}
