package models

import "time"

type User struct {
	ID         int       `json:"user_id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	Role       string    `json:"role"`
	PicProfile *string   `json:"pic_profile,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Writer struct {
	WriterID     int         `json:"writer_id"`
	UserID       int         `json:"user_id"`
	NameLastname string      `json:"name_lastname"`
	PenName      string      `json:"pen_name"`
	Bio          *string     `json:"bio,omitempty"`
	EmailWriter  *string     `json:"email_writer,omitempty"`
	ContactInfo  interface{} `json:"contact_info,omitempty"`
}
