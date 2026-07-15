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

// ======= Novel Repository Methods =======

func (r *postgresNovelRepository) ListNovels() ([]models.Novel, error) {
	return GetNovels(r.db)
}

func (r *postgresNovelRepository) GetNovelByID(id int) (*models.Novel, error) {
	return GetNovelByID(r.db, id)
}

func (r *postgresNovelRepository) IncrementViews(novelID int) error {
	return IncrementNovelViews(r.db, novelID)
}

func (r *postgresNovelRepository) GetNovelsByAuthorID(authorID int) ([]models.Novel, error) {
	return GetNovelsByAuthorID(r.db, authorID)
}

func (r *postgresNovelRepository) CreateNovel(novel models.Novel) (int, error) {
	return CreateNovel(r.db, novel)
}

func (r *postgresNovelRepository) UpdateNovel(novel models.Novel) error {
	return UpdateNovel(r.db, novel)
}

func (r *postgresNovelRepository) DeleteNovel(id int) error {
	return DeleteNovel(r.db, id)
}

// ======= Scene Repository Methods =======

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

func (r *postgresSceneRepository) UpdateScene(scene models.Scene) error {
	return UpdateScene(r.db, scene)
}

func (r *postgresSceneRepository) DeleteScene(sceneID int) error {
	return DeleteScene(r.db, sceneID)
}

func (r *postgresSceneRepository) GetChoiceByID(choiceID int) (*models.Choice, error) {
	return GetChoiceByID(r.db, choiceID)
}

func (r *postgresSceneRepository) UpdateChoice(choice models.Choice) error {
	return UpdateChoice(r.db, choice)
}

func (r *postgresSceneRepository) DeleteChoice(choiceID int) error {
	return DeleteChoice(r.db, choiceID)
}

func (r *postgresSceneRepository) CountScenesInNovel(novelID int) (int, error) {
	return CountScenesInNovel(r.db, novelID)
}

func (r *postgresSceneRepository) CreateChoice(choice models.Choice) (int, error) {
	return CreateChoice(r.db, choice)
}

// ======= Chapter Repository Methods =======

func (r *postgresChapterRepository) GetChaptersByNovelID(novelID int) ([]models.Chapter, error) {
	return GetChaptersByNovelID(r.db, novelID)
}

func (r *postgresChapterRepository) GetChapterByID(id int) (*models.Chapter, error) {
	return GetChapterByID(r.db, id)
}

func (r *postgresChapterRepository) CreateChapter(chapter models.Chapter) (int, error) {
	return CreateChapter(r.db, chapter)
}

func (r *postgresChapterRepository) UpdateChapter(chapter models.Chapter) error {
	return UpdateChapter(r.db, chapter)
}

func (r *postgresChapterRepository) DeleteChapter(chapterID int) error {
	return DeleteChapter(r.db, chapterID)
}

// ======= Social Repository Methods =======

func (r *postgresSocialRepository) AddLike(like models.Like) error {
	return AddLike(r.db, like)
}

func (r *postgresSocialRepository) RemoveLike(userID, novelID int) error {
	return RemoveLike(r.db, userID, novelID)
}

func (r *postgresSocialRepository) IsLikeExists(userID, novelID int) (bool, error) {
	return IsLikeExists(r.db, userID, novelID)
}

func (r *postgresSocialRepository) AddToBookshelf(userID, novelID int) error {
	return AddToBookshelf(r.db, userID, novelID)
}

func (r *postgresSocialRepository) RemoveFromBookshelf(userID, novelID int) error {
	return RemoveFromBookshelf(r.db, userID, novelID)
}

func (r *postgresSocialRepository) GetBookshelfByUserID(userID int) ([]models.Novel, error) {
	return GetBookshelfByUserID(r.db, userID)
}

func (r *postgresSocialRepository) GetBookshelfCountByNovelID(novelID int) (int, error) {
	return GetBookshelfCountByNovelID(r.db, novelID)
}

func (r *postgresSocialRepository) GetBookshelfCountsByAuthorID(authorID int) ([]models.Novel, error) {
	return GetBookshelfCountsByAuthorID(r.db, authorID)
}

func (r *postgresSocialRepository) AddComment(comment models.Comment) (int, error) {
	return AddComment(r.db, comment)
}

func (r *postgresSocialRepository) RemoveComment(commentID, userID int) error {
	return RemoveComment(r.db, commentID, userID)
}

func (r *postgresSocialRepository) AddFollow(follow models.Follow) error {
	return AddFollow(r.db, follow)
}

func (r *postgresSocialRepository) RemoveFollow(userID, writerID int) error {
	return RemoveFollow(r.db, userID, writerID)
}

func (r *postgresSocialRepository) GetFollowingWriters(userID int) ([]models.Writer, error) {
	return GetFollowingWriters(r.db, userID)
}

func (r *postgresSocialRepository) GetCommentCountByNovelID(novelID int) (int, error) {
	return GetCommentCountByNovelID(r.db, novelID)
}

func (r *postgresSocialRepository) GetCommentsByNovelID(novelID int) ([]models.Comment, error) {
	return GetCommentsByNovelID(r.db, novelID)
}

func (r *postgresSocialRepository) GetCommentsBySceneID(sceneID int) ([]models.Comment, error) {
	return GetCommentsBySceneID(r.db, sceneID)
}
