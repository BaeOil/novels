package service

import (
	"errors"
	"testing"

	"novel-be/internal/models"
)

type choiceIntegrityRepo struct {
	scenes        map[int]*models.Scene
	choicesByFrom map[int][]models.Choice
	edges         []models.SceneEdge
	updated       *models.Choice
	created       *models.Choice
}

func (r *choiceIntegrityRepo) GetSceneByID(id int) (*models.Scene, error) {
	scene, ok := r.scenes[id]
	if !ok {
		return nil, errors.New("scene not found")
	}
	return scene, nil
}
func (r *choiceIntegrityRepo) GetStartSceneByNovelID(int) (*models.Scene, error) {
	return nil, errors.New("not implemented")
}
func (r *choiceIntegrityRepo) GetChoicesBySceneID(id int) ([]models.Choice, error) {
	return r.choicesByFrom[id], nil
}
func (r *choiceIntegrityRepo) GetChoiceByID(id int) (*models.Choice, error) {
	for _, choices := range r.choicesByFrom {
		for _, choice := range choices {
			if choice.ChoiceID == id {
				copy := choice
				return &copy, nil
			}
		}
	}
	return nil, errors.New("choice not found")
}
func (r *choiceIntegrityRepo) GetScenesByChapterID(int) ([]models.Scene, error) { return nil, nil }
func (r *choiceIntegrityRepo) CreateScene(models.Scene) (int, error) {
	return 0, errors.New("not implemented")
}
func (r *choiceIntegrityRepo) UpdateScene(models.Scene) error { return nil }
func (r *choiceIntegrityRepo) DeleteScene(int) error          { return nil }
func (r *choiceIntegrityRepo) CreateChoice(choice models.Choice) (int, error) {
	r.created = &choice
	return choice.ChoiceID, nil
}
func (r *choiceIntegrityRepo) UpdateChoice(choice models.Choice) error {
	r.updated = &choice
	return nil
}
func (r *choiceIntegrityRepo) DeleteChoice(int) error                  { return nil }
func (r *choiceIntegrityRepo) CountScenesInNovel(int) (int, error)     { return 0, nil }
func (r *choiceIntegrityRepo) GetIncomingChoiceCount(int) (int, error) { return 0, nil }
func (r *choiceIntegrityRepo) UpdateSceneTypeByID(int, string) error   { return nil }
func (r *choiceIntegrityRepo) CheckChoiceExists(fromID, toID int, label string) (bool, error) {
	for _, edge := range r.edges {
		if edge.FromID == fromID && edge.ToID == toID && edge.Label == label {
			return true, nil
		}
	}
	return false, nil
}
func (r *choiceIntegrityRepo) CheckSceneExists(int, string) (bool, error)        { return false, nil }
func (r *choiceIntegrityRepo) GetNodesByNovelID(int) ([]models.SceneNode, error) { return nil, nil }
func (r *choiceIntegrityRepo) GetNodesByNovelIDForUser(int, int) ([]models.SceneNode, error) {
	return nil, nil
}
func (r *choiceIntegrityRepo) GetEdgesByNovelID(int) ([]models.SceneEdge, error) { return r.edges, nil }
func (r *choiceIntegrityRepo) GetEndingsByNovelIDForUser(int, int) ([]models.EndingScene, error) {
	return nil, nil
}
func (r *choiceIntegrityRepo) UpdateScenePosition(int, *float64, *float64) error { return nil }

func newChoiceIntegrityService() (*sceneService, *choiceIntegrityRepo) {
	repo := &choiceIntegrityRepo{
		scenes: map[int]*models.Scene{
			1: {SceneID: 1, NovelID: 10, Type: "start"},
			2: {SceneID: 2, NovelID: 10, Type: "normal"},
			3: {SceneID: 3, NovelID: 10, Type: "normal"},
			4: {SceneID: 4, NovelID: 20, Type: "normal"},
		},
		choicesByFrom: map[int][]models.Choice{
			1: {{ChoiceID: 11, FromSceneID: 1, ToSceneID: 2, Label: "old"}},
			2: {{ChoiceID: 22, FromSceneID: 2, ToSceneID: 3, Label: "foreign"}},
		},
	}
	return &sceneService{repo: repo}, repo
}

func TestSyncSceneChoicesRejectsChoiceOwnedByAnotherScene(t *testing.T) {
	svc, _ := newChoiceIntegrityService()
	_, err := svc.SyncSceneChoices(1, []interface{}{map[string]interface{}{
		"choice_id": float64(22), "label": "changed", "to_scene_id": float64(3),
	}})
	if err == nil {
		t.Fatal("expected foreign choice ownership validation error")
	}
}

func TestSyncSceneChoicesRejectsSelfLoop(t *testing.T) {
	svc, _ := newChoiceIntegrityService()
	_, err := svc.SyncSceneChoices(1, []interface{}{map[string]interface{}{
		"label": "loop", "to_scene_id": float64(1),
	}})
	if err == nil {
		t.Fatal("expected self-loop validation error")
	}
}

func TestUpdateChoiceRejectsSelfLoopAndCrossNovelTarget(t *testing.T) {
	svc, _ := newChoiceIntegrityService()
	if err := svc.UpdateChoice(models.Choice{ChoiceID: 11, ToSceneID: 1, Label: "loop"}); err == nil {
		t.Fatal("expected self-loop validation error")
	}
	if err := svc.UpdateChoice(models.Choice{ChoiceID: 11, ToSceneID: 4, Label: "cross novel"}); err == nil {
		t.Fatal("expected cross-novel validation error")
	}
}

func TestUpdateAndSyncChoiceAllowValidChanges(t *testing.T) {
	svc, repo := newChoiceIntegrityService()
	if err := svc.UpdateChoice(models.Choice{ChoiceID: 11, ToSceneID: 3, Label: "updated"}); err != nil {
		t.Fatalf("expected valid update, got %v", err)
	}
	if repo.updated == nil || repo.updated.FromSceneID != 1 || repo.updated.ToSceneID != 3 {
		t.Fatalf("unexpected updated choice: %+v", repo.updated)
	}

	_, err := svc.SyncSceneChoices(1, []interface{}{map[string]interface{}{
		"choice_id": float64(11), "label": "synced", "to_scene_id": float64(2),
	}})
	if err != nil {
		t.Fatalf("expected valid sync, got %v", err)
	}
	if repo.updated == nil || repo.updated.FromSceneID != 1 || repo.updated.Label != "synced" {
		t.Fatalf("unexpected synced choice: %+v", repo.updated)
	}
}
