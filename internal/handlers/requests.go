package handlers

import (
	"errors"
	"strings"
)

type CreateNovelRequest struct {
	Title        string  `json:"title"`
	Captions     *string `json:"captions,omitempty"`
	Introduction *string `json:"introduction,omitempty"`
	CoverImage   *string `json:"cover_image,omitempty"`
	Status       string  `json:"status,omitempty"`
	CategoryIDs  []int   `json:"category_ids,omitempty"`
	AuthorID     int     `json:"author_id"`
}

func normalizeNovelStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "publish", "published":
		return "published"
	case "completed":
		return "completed"
	default:
		return "draft"
	}
}

func (r *CreateNovelRequest) Validate() error {
	if strings.TrimSpace(r.Title) == "" {
		return errors.New("title is required")
	}
	// 🟢 ปลดล็อกเรียบร้อย: ลบเช็ค r.AuthorID == 0 ออก เพื่อปล่อยให้ด่านตรวจ (Token) ฝั่งหลังบ้านยัดไอดีให้เอง
	if strings.TrimSpace(r.Status) == "" {
		r.Status = "draft"
	} else {
		r.Status = normalizeNovelStatus(r.Status)
	}
	return nil
}

type UpdateNovelRequest struct {
	Title        string  `json:"title,omitempty"`
	Captions     *string `json:"captions,omitempty"`
	Introduction *string `json:"introduction,omitempty"`
	CoverImage   *string `json:"cover_image,omitempty"`
	CategoryIDs  []int   `json:"category_ids,omitempty"`
	Status       string  `json:"status,omitempty"`
}

func (r *UpdateNovelRequest) Validate() error {
	if strings.TrimSpace(r.Status) != "" {
		r.Status = normalizeNovelStatus(r.Status)
	}

	// At least one updatable field must be present
	if strings.TrimSpace(r.Title) == "" && strings.TrimSpace(r.Status) == "" && r.Captions == nil && r.Introduction == nil && r.CoverImage == nil && len(r.CategoryIDs) == 0 {
		return errors.New("at least one field is required")
	}
	return nil
}

type CreateChapterRequest struct {
	NovelID int    `json:"novel_id"`
	Episode int    `json:"episode"`
	Title   string `json:"title"`
	Status  string `json:"status,omitempty"`
}

func (r *CreateChapterRequest) Validate() error {
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	if r.Episode == 0 {
		return errors.New("episode is required")
	}
	if strings.TrimSpace(r.Title) == "" {
		return errors.New("title is required")
	}
	if strings.TrimSpace(r.Status) == "" {
		r.Status = "draft"
	}
	return nil
}

type UpdateChapterRequest struct {
	Title  string `json:"title,omitempty"`
	Status string `json:"status,omitempty"`
}

func (r *UpdateChapterRequest) Validate() error {
	if strings.TrimSpace(r.Title) == "" && strings.TrimSpace(r.Status) == "" {
		return errors.New("title or status is required")
	}
	return nil
}

type CreateSceneRequest struct {
	NovelID           int    `json:"novel_id"`
	ChapterID         int    `json:"chapter_id"`
	Title             string `json:"title"`
	Content           string `json:"content"`
	ImageURL          string `json:"image_url"`
	Type              string `json:"type"`
	EndingTitle       string `json:"ending_title"`
	EndingType        string `json:"ending_type"`
	EndingDescription string `json:"ending_description"`
}

func (r *CreateSceneRequest) Validate() error {
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	if r.ChapterID == 0 {
		return errors.New("chapter_id is required")
	}
	if strings.TrimSpace(r.Title) == "" {
		return errors.New("title is required")
	}
	if strings.TrimSpace(r.Type) == "" {
		r.Type = "normal"
	}
	return nil
}

type UpdateSceneRequest struct {
	Title             string        `json:"title"`
	Content           string        `json:"content"`
	Type              string        `json:"type"`
	IsEnding          bool          `json:"is_ending"`
	EndingTitle       string        `json:"ending_title"`
	EndingType        string        `json:"ending_type"`
	EndingDescription string        `json:"ending_description"`
	Status            string        `json:"status"`
	Choices           []interface{} `json:"choices,omitempty"`
}

func (r *UpdateSceneRequest) Validate() error {
	return nil
}

type CreateChoiceRequest struct {
	FromSceneID int    `json:"from_scene_id"`
	ToSceneID   int    `json:"to_scene_id"`
	Label       string `json:"label"`
}

func (r *CreateChoiceRequest) Validate() error {
	if r.FromSceneID == 0 {
		return errors.New("from_scene_id is required")
	}
	if r.ToSceneID == 0 {
		return errors.New("to_scene_id is required")
	}
	if strings.TrimSpace(r.Label) == "" {
		return errors.New("label is required")
	}
	return nil
}

type UpdateChoiceRequest struct {
	Label     string `json:"label"`
	ToSceneID int    `json:"to_scene_id"`
}

func (r *UpdateChoiceRequest) Validate() error {
	if strings.TrimSpace(r.Label) == "" {
		return errors.New("label is required")
	}
	if r.ToSceneID == 0 {
		return errors.New("to_scene_id is required")
	}
	return nil
}

type LikeRequest struct {
	UserID  int `json:"user_id"`
	NovelID int `json:"novel_id"`
}

func (r *LikeRequest) Validate() error {
	if r.UserID == 0 {
		return errors.New("user_id is required")
	}
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	return nil
}

type BookshelfRequest struct {
	UserID  int `json:"user_id"`
	NovelID int `json:"novel_id"`
}

func (r *BookshelfRequest) Validate() error {
	if r.UserID == 0 {
		return errors.New("user_id is required")
	}
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	return nil
}

type CommentRequest struct {
	UserID  int    `json:"user_id"`
	NovelID int    `json:"novel_id"`
	SceneID *int   `json:"scene_id,omitempty"`
	Content string `json:"content"`
}

func (r *CommentRequest) Validate() error {
	if r.UserID == 0 {
		return errors.New("user_id is required")
	}
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	if strings.TrimSpace(r.Content) == "" {
		return errors.New("content is required")
	}
	return nil
}

type FollowRequest struct {
	FollowerID  int `json:"follower_id"`
	FollowingID int `json:"following_id"`
}

func (r *FollowRequest) Validate() error {
	if r.FollowerID == 0 {
		return errors.New("follower_id is required")
	}
	if r.FollowingID == 0 {
		return errors.New("following_id is required")
	}
	return nil
}

type SaveProgressRequest struct {
	UserID         int `json:"user_id"`
	NovelID        int `json:"novel_id"`
	CurrentSceneID int `json:"current_scene_id"`
}

func (r *SaveProgressRequest) Validate() error {
	if r.UserID == 0 {
		return errors.New("user_id is required")
	}
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	if r.CurrentSceneID == 0 {
		return errors.New("current_scene_id is required")
	}
	return nil
}

type RecordChoiceHistoryRequest struct {
	UserID   int `json:"user_id"`
	ChoiceID int `json:"choice_id"`
}

func (r *RecordChoiceHistoryRequest) Validate() error {
	if r.UserID == 0 {
		return errors.New("user_id is required")
	}
	if r.ChoiceID == 0 {
		return errors.New("choice_id is required")
	}
	return nil
}
