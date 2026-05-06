package models

type Chapter struct {
    ChapterID int    `json:"chapter_id"`
    NovelID   int    `json:"novel_id"`
    Title     string `json:"title"`
}
