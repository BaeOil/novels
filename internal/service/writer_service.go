package service

import (
	"database/sql"
	"novel-be/internal/models"
)

type WriterRepository interface {
	GetWriterByID(id int) (*models.Writer, error)
}

type writerService struct {
	db *sql.DB
}

func NewWriterService(db *sql.DB) WriterService {
	return &writerService{db: db}
}

func (s *writerService) GetWriterByID(id int) (interface{}, error) {
	row := s.db.QueryRow(`
        SELECT writer_id, user_id, name_lastname, pen_name, bio, email_writer, contact_info
        FROM writers
        WHERE writer_id = $1
    `, id)

	var w models.Writer
	err := row.Scan(&w.WriterID, &w.UserID, &w.NameLastname, &w.PenName, &w.Bio, &w.EmailWriter, &w.ContactInfo)
	if err != nil {
		return nil, err
	}

	return w, nil
}
