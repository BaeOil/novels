package dto

// Novel DTOs
type CreateNovelDTO struct {
	Title        string  `json:"title"`
	Captions     *string `json:"captions,omitempty"`
	Introduction *string `json:"introduction,omitempty"`
	CoverImage   *string `json:"cover_image,omitempty"`
	Status       string  `json:"status,omitempty"`
	AuthorID     int     `json:"author_id"`
}

// Chapter DTOs
type CreateChapterDTO struct {
	NovelID int    `json:"novel_id"`
	Episode int    `json:"episode"`
	Title   string `json:"title"`
	Status  string `json:"status,omitempty"`
}

// Scene DTOs
type CreateSceneDTO struct {
	NovelID           int     `json:"novel_id"`
	ChapterID         int     `json:"chapter_id"`
	Title             string  `json:"title,omitempty"`
	Content           string  `json:"content"`
	Type              string  `json:"type,omitempty"`
	EndingTitle       *string `json:"ending_title,omitempty"`
	EndingType        *string `json:"ending_type,omitempty"`
	EndingDescription *string `json:"ending_description,omitempty"`
}

// Choice DTOs
type CreateChoiceDTO struct {
	FromSceneID int    `json:"from_scene_id"`
	ToSceneID   int    `json:"to_scene_id"`
	Label       string `json:"label"`
}

// Social DTOs
type LikeDTO struct {
	UserID  int `json:"user_id"`
	NovelID int `json:"novel_id"`
}

type CommentDTO struct {
	UserID  int    `json:"user_id"`
	NovelID int    `json:"novel_id"`
	SceneID *int   `json:"scene_id,omitempty"`
	Content string `json:"content"`
}

type FollowDTO struct {
	FollowerID  int `json:"follower_id"`
	FollowingID int `json:"following_id"`
}

// Reading DTOs
type SaveProgressDTO struct {
	UserID         int `json:"user_id"`
	NovelID        int `json:"novel_id"`
	CurrentSceneID int `json:"current_scene_id"`
}

type RecordChoiceHistoryDTO struct {
	UserID   int `json:"user_id"`
	ChoiceID int `json:"choice_id"`
}
