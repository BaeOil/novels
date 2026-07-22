package models

import "time"

type User struct {
	ID           uint      `json:"id" db:"user_id"`
	Username     string    `json:"username" db:"username"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	PicProfile   string    `json:"pic_profile" db:"pic_profile"`
	Role         string    `json:"role" db:"role"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type WriterNovel struct {
	ID           int    `json:"id"`
	Title        string `json:"title"`
	Status       string `json:"status,omitempty"`
	Cover        string `json:"cover,omitempty"`
	ChapterCount int    `json:"chapter_count,omitempty"`
}

type LatestUpdate struct {
	Title  string `json:"title"`
	Detail string `json:"detail,omitempty"`
	Time   string `json:"time,omitempty"`
}

type Writer struct {
	WriterID       int           `json:"writer_id" db:"writer_id"`
	UserID         int           `json:"user_id" db:"user_id"`
	Username       string        `json:"username,omitempty"`
	NameLastname   string        `json:"name_lastname"`
	PenName        string        `json:"pen_name"`
	Bio            *string       `json:"bio,omitempty"`
	EmailWriter    *string       `json:"email_writer,omitempty"`
	ContactInfo    interface{}   `json:"contact_info,omitempty"`
	AvatarURL      string        `json:"avatar_url,omitempty" db:"avatar_url"`
	Status         string        `json:"status,omitempty" db:"status"`
	FollowerCount  int           `json:"follower_count,omitempty"`
	NovelCount     int           `json:"novel_count,omitempty"`
	Novels         []WriterNovel `json:"novels,omitempty"`
	LatestUpdate   *LatestUpdate `json:"latest_update,omitempty"`
	TotalLikeCount      int           `json:"total_like_count,omitempty" db:"total_like_count"`
	TotalViewCount      int           `json:"total_view_count,omitempty" db:"total_view_count"`
	TotalBookshelfCount int           `json:"total_bookshelf_count" db:"total_bookshelf_count"`
	Categories          []Category    `json:"categories,omitempty"`
	AppliedAt           *time.Time    `json:"applied_at,omitempty"`
	ApprovedAt          *time.Time    `json:"approved_at,omitempty"`
}
