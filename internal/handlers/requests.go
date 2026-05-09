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
	AuthorID     int     `json:"author_id"`
}

func (r *CreateNovelRequest) Validate() error {
	if strings.TrimSpace(r.Title) == "" {
		return errors.New("title is required")
	}
	if r.AuthorID == 0 {
		return errors.New("author_id is required")
	}
	if strings.TrimSpace(r.Status) == "" {
		r.Status = "draft"
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

type CreateSceneRequest struct {
	NovelID           int     `json:"novel_id"`
	ChapterID         int     `json:"chapter_id"`
	Title             string  `json:"title,omitempty"`
	Content           string  `json:"content"`
	Type              string  `json:"type,omitempty"`
	EndingTitle       *string `json:"ending_title,omitempty"`
	EndingType        *string `json:"ending_type,omitempty"`
	EndingDescription *string `json:"ending_description,omitempty"`
}

func (r *CreateSceneRequest) Validate() error {
	if r.NovelID == 0 {
		return errors.New("novel_id is required")
	}
	if r.ChapterID == 0 {
		return errors.New("chapter_id is required")
	}
	if strings.TrimSpace(r.Content) == "" {
		return errors.New("content is required")
	}
	if strings.TrimSpace(r.Type) == "" {
		r.Type = "normal"
	}
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
