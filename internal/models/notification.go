package models

import "time"

type Notification struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	Type           string    `json:"type"`
	Title          *string   `json:"title,omitempty"`
	Message        string    `json:"message"`
	CoverImage     *string   `json:"cover_image,omitempty"`
	ReferenceID    *int      `json:"reference_id,omitempty"`
	ReferenceType  *string   `json:"reference_type,omitempty"`
	IsRead         bool      `json:"is_read"`
	CreatedAt      time.Time `json:"created_at"`
	ActorID        int       `json:"actor_id,omitempty"`
	ActorName      string    `json:"actor_name,omitempty"`
	ActorAvatar    string    `json:"actor_avatar,omitempty"`
	ActorColor     string    `json:"actor_color,omitempty"`
	ReferenceTitle string    `json:"reference_title,omitempty"`
}
