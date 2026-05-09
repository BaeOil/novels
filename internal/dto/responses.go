package dto

// Common response wrappers
type SuccessResponse struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Status  int    `json:"status"`
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// Novel Response DTOs
type NovelDetailDTO struct {
	ID           int     `json:"novel_id"`
	Title        string  `json:"title"`
	Captions     *string `json:"captions,omitempty"`
	Introduction *string `json:"introduction,omitempty"`
	CoverImage   *string `json:"cover_image,omitempty"`
	Status       string  `json:"status"`
	AuthorID     int     `json:"author_id"`
	AuthorName   string  `json:"author_name"`
	PenName      string  `json:"pen_name"`
	Views        int     `json:"views"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// Chapter Response DTOs
type ChapterDetailDTO struct {
	ChapterID int    `json:"chapter_id"`
	NovelID   int    `json:"novel_id"`
	Episode   int    `json:"episode"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	Scenes    []struct {
		SceneID int    `json:"scene_id"`
		Title   string `json:"title"`
		Type    string `json:"type"`
	} `json:"scenes,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// Scene Response DTOs
type SceneDetailDTO struct {
	SceneID           int         `json:"scene_id"`
	ChapterID         int         `json:"chapter_id"`
	NovelID           int         `json:"novel_id"`
	Title             string      `json:"title"`
	Content           string      `json:"content"`
	Type              string      `json:"type"`
	EndingTitle       *string     `json:"ending_title,omitempty"`
	EndingType        *string     `json:"ending_type,omitempty"`
	EndingDescription *string     `json:"ending_description,omitempty"`
	Choices           []ChoiceDTO `json:"choices"`
}

type ChoiceDTO struct {
	ChoiceID    int    `json:"choice_id"`
	FromSceneID int    `json:"from_scene_id"`
	ToSceneID   int    `json:"to_scene_id"`
	Label       string `json:"label"`
}

// Comment Response DTOs
type CommentDetailDTO struct {
	CommentID int    `json:"comment_id"`
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	NovelID   int    `json:"novel_id"`
	SceneID   *int   `json:"scene_id,omitempty"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// Upload Response
type UploadResponseDTO struct {
	FileName string `json:"filename"`
	URL      string `json:"url"`
	Size     int64  `json:"size"`
}
