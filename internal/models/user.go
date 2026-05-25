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

type Writer struct {
	WriterID     int         `json:"writer_id"`
	UserID       int         `json:"user_id"`
	NameLastname string      `json:"name_lastname"`
	PenName      string      `json:"pen_name"`
	Bio          *string     `json:"bio,omitempty"`
	EmailWriter  *string     `json:"email_writer,omitempty"`
	ContactInfo  interface{} `json:"contact_info,omitempty"`
	Status       string      `json:"status,omitempty" db:"status"`
}
