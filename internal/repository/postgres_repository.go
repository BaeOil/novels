package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

type postgresNovelRepository struct {
	db *sql.DB
}

type postgresSceneRepository struct {
	db *sql.DB
}

type postgresChapterRepository struct {
	db *sql.DB
}

type postgresSocialRepository struct {
	db *sql.DB
}

type postgresReadingRepository struct {
	db *sql.DB
}

func NewNovelRepository(db *sql.DB) NovelRepository {
	return &postgresNovelRepository{db: db}
}

func NewSceneRepository(db *sql.DB) SceneRepository {
	return &postgresSceneRepository{db: db}
}

func NewChapterRepository(db *sql.DB) ChapterRepository {
	return &postgresChapterRepository{db: db}
}

func NewSocialRepository(db *sql.DB) SocialRepository {
	return &postgresSocialRepository{db: db}
}

func NewReadingRepository(db *sql.DB) ReadingRepository {
	return &postgresReadingRepository{db: db}
}

// Novel Repository Methods
func (r *postgresNovelRepository) ListNovels() ([]models.Novel, error) {
	return GetNovels(r.db)
}

func (r *postgresNovelRepository) GetNovelByID(id int) (*models.Novel, error) {
	return GetNovelByID(r.db, id)
}

func (r *postgresNovelRepository) CreateNovel(novel models.Novel) (int, error) {
	return CreateNovel(r.db, novel)
}

// Scene Repository Methods
func (r *postgresSceneRepository) GetSceneByID(id int) (*models.Scene, error) {
	return GetSceneByID(r.db, id)
}

func (r *postgresSceneRepository) GetStartSceneByNovelID(novelID int) (*models.Scene, error) {
	return GetStartSceneByNovelID(r.db, novelID)
}

func (r *postgresSceneRepository) GetChoicesBySceneID(sceneID int) ([]models.Choice, error) {
	return GetChoicesBySceneID(r.db, sceneID)
}

func (r *postgresSceneRepository) GetScenesByChapterID(chapterID int) ([]models.Scene, error) {
	return GetScenesByChapterID(r.db, chapterID)
}

func (r *postgresSceneRepository) CreateScene(scene models.Scene) (int, error) {
	return CreateScene(r.db, scene)
}

func (r *postgresSceneRepository) CreateChoice(choice models.Choice) (int, error) {
	return CreateChoice(r.db, choice)
}

// Chapter Repository Methods
func (r *postgresChapterRepository) GetChaptersByNovelID(novelID int) ([]models.Chapter, error) {
	return GetChaptersByNovelID(r.db, novelID)
}

func (r *postgresChapterRepository) GetChapterByID(id int) (*models.Chapter, error) {
	return GetChapterByID(r.db, id)
}

func (r *postgresChapterRepository) CreateChapter(chapter models.Chapter) (int, error) {
	return CreateChapter(r.db, chapter)
}

// Social Repository Methods
func (r *postgresSocialRepository) AddLike(like models.Like) error {
	return AddLike(r.db, like)
}

func (r *postgresSocialRepository) AddComment(comment models.Comment) (int, error) {
	return AddComment(r.db, comment)
}

func (r *postgresSocialRepository) AddFollow(follow models.Follow) error {
	return AddFollow(r.db, follow)
}

func (r *postgresSocialRepository) GetCommentsByNovelID(novelID int) ([]models.Comment, error) {
	return GetCommentsByNovelID(r.db, novelID)
}

func (r *postgresSocialRepository) GetCommentsBySceneID(sceneID int) ([]models.Comment, error) {
	return GetCommentsBySceneID(r.db, sceneID)
}

// Reading Repository Methods
func (r *postgresReadingRepository) GetReadingProgress(userID, novelID int) (*models.ReadingProgress, error) {
	return GetReadingProgress(r.db, userID, novelID)
}

func (r *postgresReadingRepository) SaveReadingProgress(progress models.ReadingProgress) error {
	return SaveReadingProgress(r.db, progress)
}

func (r *postgresReadingRepository) InsertChoiceHistory(history models.ChoiceHistory) error {
	return InsertChoiceHistory(r.db, history)
}
