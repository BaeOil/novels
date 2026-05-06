package models

import "time"

type Novel struct {
	ID           int       `json:"novel_id"`
	Title        string    `json:"title"`
	Captions     *string   `json:"captions"`
	Introduction *string   `json:"introduction"`
	CoverImage   *string   `json:"cover_image"`
	Status       string    `json:"status"`
	AuthorID     int       `json:"author_id"`
	AuthorName   string    `json:"author_name"`
	PenName      string    `json:"pen_name"`
	Views        int       `json:"views"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
