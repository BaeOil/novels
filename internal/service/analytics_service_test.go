package service_test

import (
	"errors"
	"testing"

	"novel-be/internal/models"
	"novel-be/internal/service"
)

// ─── Mock AnalyticsRepository ─────────────────────────────────────────────

// mockAnalyticsRepo implement repository.AnalyticsRepository ใน test
// ไม่ต้อง import repository package เพราะใช้ duck typing ผ่าน interface
type mockAnalyticsRepo struct {
	result       *models.NovelOverviewStats
	sceneResult  *models.SceneAnalyticsStats
	choiceResult *models.SceneChoiceAnalyticsStats
	err          error
}

func (m *mockAnalyticsRepo) GetNovelOverview(_ int) (*models.NovelOverviewStats, error) {
	return m.result, m.err
}

func (m *mockAnalyticsRepo) GetSceneAnalytics(_, _ int) (*models.SceneAnalyticsStats, error) {
	return m.sceneResult, m.err
}

func (m *mockAnalyticsRepo) GetSceneChoiceAnalytics(_, _ int) (*models.SceneChoiceAnalyticsStats, error) {
	return m.choiceResult, m.err
}

// helper สร้าง service ที่ใช้ mock repo
func newTestService(repo *mockAnalyticsRepo) service.AnalyticsService {
	return service.NewAnalyticsService(repo)
}

// ... existing NovelOverview tests ...
// [The existing NovelOverview tests remain unchanged]

// ─── Scene Analytics Tests ──────────────────────────────────────────────────

func TestGetSceneAnalytics_Normal(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID:       10,
			Title:         "ฉากทางแยก",
			VisitCount:    150,
			UniqueReaders: 100,
			DropOffRate:   20.0,
			PreviousScenes: []models.PreviousSceneStat{
				{SceneID: 1, Title: "ฉากเริ่มเรื่อง", TransitionCount: 80},
				{SceneID: 2, Title: "ฉากลับ", TransitionCount: 20},
			},
			NextScenes: []models.NextSceneStat{
				{SceneID: 11, Title: "ป่าทึบ", ChoiceLabel: "เดินเข้าป่า", TransitionCount: 50},
				{SceneID: 12, Title: "แม่น้ำ", ChoiceLabel: "ข้ามแม่น้ำ", TransitionCount: 30},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// RepeatVisitCount = 150 - 100 = 50
	if got.RepeatVisitCount != 50 {
		t.Errorf("RepeatVisitCount: want 50, got %d", got.RepeatVisitCount)
	}

	// PreviousScenes percentage (total = 100): 80/100 -> 80%, 20/100 -> 20%
	if len(got.PreviousScenes) != 2 {
		t.Fatalf("PreviousScenes count: want 2, got %d", len(got.PreviousScenes))
	}
	if got.PreviousScenes[0].Percentage != 80.0 {
		t.Errorf("PreviousScenes[0] pct: want 80.0, got %.2f", got.PreviousScenes[0].Percentage)
	}
	if got.PreviousScenes[1].Percentage != 20.0 {
		t.Errorf("PreviousScenes[1] pct: want 20.0, got %.2f", got.PreviousScenes[1].Percentage)
	}

	// NextScenes percentage (total = 80): 50/80 -> 62.5%, 30/80 -> 37.5%
	if len(got.NextScenes) != 2 {
		t.Fatalf("NextScenes count: want 2, got %d", len(got.NextScenes))
	}
	if got.NextScenes[0].Percentage != 62.5 {
		t.Errorf("NextScenes[0] pct: want 62.5, got %.2f", got.NextScenes[0].Percentage)
	}
	if got.NextScenes[1].Percentage != 37.5 {
		t.Errorf("NextScenes[1] pct: want 37.5, got %.2f", got.NextScenes[1].Percentage)
	}
}

func TestGetSceneAnalytics_ZeroVisits(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID:        10,
			Title:          "ฉากยังไม่มีคนเข้า",
			VisitCount:     0,
			UniqueReaders:  0,
			DropOffRate:    0.0,
			PreviousScenes: []models.PreviousSceneStat{},
			NextScenes:     []models.NextSceneStat{},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.RepeatVisitCount != 0 {
		t.Errorf("RepeatVisitCount: want 0, got %d", got.RepeatVisitCount)
	}
	if got.DropOffRate != 0.0 {
		t.Errorf("DropOffRate: want 0.0, got %.2f", got.DropOffRate)
	}
}

func TestGetSceneAnalytics_RepeatVisitCalculation(t *testing.T) {
	tests := []struct {
		name       string
		visit      int64
		unique     int64
		wantRepeat int64
	}{
		{"visit > unique", 200, 150, 50},
		{"visit == unique", 100, 100, 0},
		{"visit < unique (edge guard)", 80, 100, 0}, // Guard against invalid raw data
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockAnalyticsRepo{
				sceneResult: &models.SceneAnalyticsStats{
					VisitCount:    tc.visit,
					UniqueReaders: tc.unique,
				},
			}
			svc := newTestService(repo)
			got, err := svc.GetSceneAnalytics(1, 10)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.RepeatVisitCount != tc.wantRepeat {
				t.Errorf("RepeatVisitCount: want %d, got %d", tc.wantRepeat, got.RepeatVisitCount)
			}
		})
	}
}

func TestGetSceneAnalytics_NoPreviousScenes(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID:        1,
			Title:          "ฉากแรกของเรื่อง",
			VisitCount:     100,
			UniqueReaders:  100,
			PreviousScenes: []models.PreviousSceneStat{},
			NextScenes: []models.NextSceneStat{
				{SceneID: 2, Title: "ฉากถัดไป", TransitionCount: 80},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(got.PreviousScenes) != 0 {
		t.Errorf("PreviousScenes: want empty, got %d", len(got.PreviousScenes))
	}
}

func TestGetSceneAnalytics_MultiplePreviousScenes(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID: 5,
			PreviousScenes: []models.PreviousSceneStat{
				{SceneID: 2, TransitionCount: 30},
				{SceneID: 3, TransitionCount: 50},
				{SceneID: 4, TransitionCount: 20},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Total transitions = 100
	wantPcts := []float64{30.0, 50.0, 20.0}
	for i, want := range wantPcts {
		if got.PreviousScenes[i].Percentage != want {
			t.Errorf("[%d] PreviousScenes pct: want %.2f, got %.2f", i, want, got.PreviousScenes[i].Percentage)
		}
	}
}

func TestGetSceneAnalytics_NoNextScenes(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID:        99,
			Title:          "ฉากจบ Good Ending",
			VisitCount:     50,
			UniqueReaders:  50,
			PreviousScenes: []models.PreviousSceneStat{{SceneID: 10, TransitionCount: 50}},
			NextScenes:     []models.NextSceneStat{},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 99)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(got.NextScenes) != 0 {
		t.Errorf("NextScenes: want empty, got %d", len(got.NextScenes))
	}
}

func TestGetSceneAnalytics_MultipleNextScenes(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: &models.SceneAnalyticsStats{
			SceneID: 10,
			NextScenes: []models.NextSceneStat{
				{SceneID: 11, TransitionCount: 15},
				{SceneID: 12, TransitionCount: 35},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Total transitions = 50 -> 15/50 = 30%, 35/50 = 70%
	if got.NextScenes[0].Percentage != 30.0 {
		t.Errorf("NextScenes[0] pct: want 30.0, got %.2f", got.NextScenes[0].Percentage)
	}
	if got.NextScenes[1].Percentage != 70.0 {
		t.Errorf("NextScenes[1] pct: want 70.0, got %.2f", got.NextScenes[1].Percentage)
	}
}

func TestGetSceneAnalytics_SceneNotBelongingToNovel(t *testing.T) {
	repo := &mockAnalyticsRepo{
		sceneResult: nil, // repo returns nil stats when scene not in novel
	}

	svc := newTestService(repo)
	_, err := svc.GetSceneAnalytics(1, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, service.ErrSceneNotFound) {
		t.Errorf("error: want ErrSceneNotFound, got %v", err)
	}
}

func TestGetSceneAnalytics_RepoError(t *testing.T) {
	repoErr := errors.New("db connection failure")
	repo := &mockAnalyticsRepo{
		err: repoErr,
	}

	svc := newTestService(repo)
	_, err := svc.GetSceneAnalytics(1, 10)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, repoErr) {
		t.Errorf("error: want %v, got %v", repoErr, err)
	}
}

// ─── Test: normal statistics ──────────────────────────────────────────────

func TestGetNovelOverview_Normal(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			TotalViews:       1000,
			UniqueReaders:    200,
			CompletedReaders: 80,
			// completion_rate และ percentage จะถูก fill โดย service
			EndingStats: []models.EndingStat{
				{EndingType: "good_ending", Count: 50},
				{EndingType: "bad_ending", Count: 30},
			},
			TopDropOffScenes: []models.DropOffScene{
				{SceneID: 5, Title: "ฉากเปิดเรื่อง", VisitCount: 180, UniqueReaders: 170, DropOffRate: 15.5},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// total_views ส่งต่อจาก repo ตรงๆ
	if got.TotalViews != 1000 {
		t.Errorf("TotalViews: want 1000, got %d", got.TotalViews)
	}

	// completion_rate = 80/200 × 100 = 40.00
	wantRate := 40.0
	if got.CompletionRate != wantRate {
		t.Errorf("CompletionRate: want %.2f, got %.2f", wantRate, got.CompletionRate)
	}

	// good_ending percentage = 50/200 × 100 = 25.00
	if len(got.EndingStats) != 2 {
		t.Fatalf("EndingStats: want 2, got %d", len(got.EndingStats))
	}
	if got.EndingStats[0].Percentage != 25.0 {
		t.Errorf("good_ending percentage: want 25.00, got %.2f", got.EndingStats[0].Percentage)
	}
	// bad_ending percentage = 30/200 × 100 = 15.00
	if got.EndingStats[1].Percentage != 15.0 {
		t.Errorf("bad_ending percentage: want 15.00, got %.2f", got.EndingStats[1].Percentage)
	}

	// drop-off ส่งต่อจาก repo ไม่แก้ไข
	if len(got.TopDropOffScenes) != 1 {
		t.Fatalf("TopDropOffScenes: want 1, got %d", len(got.TopDropOffScenes))
	}
	if got.TopDropOffScenes[0].DropOffRate != 15.5 {
		t.Errorf("DropOffRate: want 15.5, got %.2f", got.TopDropOffScenes[0].DropOffRate)
	}
}

// ─── Test: zero readers ───────────────────────────────────────────────────

func TestGetNovelOverview_ZeroReaders(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			TotalViews:       50,
			UniqueReaders:    0,
			CompletedReaders: 0,
			EndingStats:      []models.EndingStat{},
			TopDropOffScenes: []models.DropOffScene{},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// ต้องไม่ divide by zero
	if got.CompletionRate != 0 {
		t.Errorf("CompletionRate with 0 readers: want 0, got %.2f", got.CompletionRate)
	}
	if len(got.EndingStats) != 0 {
		t.Errorf("EndingStats: want empty, got len=%d", len(got.EndingStats))
	}
}

// ─── Test: completed readers = 0 ─────────────────────────────────────────

func TestGetNovelOverview_ZeroCompleted(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			TotalViews:       300,
			UniqueReaders:    100,
			CompletedReaders: 0,
			EndingStats:      []models.EndingStat{},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// completion_rate = 0/100 × 100 = 0
	if got.CompletionRate != 0 {
		t.Errorf("CompletionRate: want 0, got %.2f", got.CompletionRate)
	}
}

// ─── Test: multiple ending types ─────────────────────────────────────────

func TestGetNovelOverview_MultipleEndingTypes(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			UniqueReaders:    400,
			CompletedReaders: 100,
			EndingStats: []models.EndingStat{
				{EndingType: "true_ending", Count: 10},
				{EndingType: "good_ending", Count: 60},
				{EndingType: "bad_ending", Count: 25},
				{EndingType: "secret_ending", Count: 5},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// completion_rate = 100/400 × 100 = 25.00
	if got.CompletionRate != 25.0 {
		t.Errorf("CompletionRate: want 25.00, got %.2f", got.CompletionRate)
	}

	// ตรวจสอบ percentage ทุก ending type
	cases := []struct {
		idx     int
		eType   string
		count   int64
		wantPct float64
	}{
		{0, "true_ending", 10, 2.5},
		{1, "good_ending", 60, 15.0},
		{2, "bad_ending", 25, 6.25},
		{3, "secret_ending", 5, 1.25},
	}

	if len(got.EndingStats) != 4 {
		t.Fatalf("EndingStats: want 4, got %d", len(got.EndingStats))
	}
	for _, tc := range cases {
		es := got.EndingStats[tc.idx]
		if es.EndingType != tc.eType {
			t.Errorf("[%d] EndingType: want %s, got %s", tc.idx, tc.eType, es.EndingType)
		}
		if es.Percentage != tc.wantPct {
			t.Errorf("[%d] %s Percentage: want %.2f, got %.2f", tc.idx, tc.eType, tc.wantPct, es.Percentage)
		}
	}
}

// ─── Test: drop-off data passthrough ─────────────────────────────────────

func TestGetNovelOverview_DropOffPassthrough(t *testing.T) {
	dropScenes := []models.DropOffScene{
		{SceneID: 1, Title: "ฉาก A", VisitCount: 500, UniqueReaders: 480, DropOffRate: 4.17},
		{SceneID: 2, Title: "ฉาก B", VisitCount: 300, UniqueReaders: 250, DropOffRate: 16.67},
		{SceneID: 3, Title: "ฉาก C", VisitCount: 100, UniqueReaders: 90, DropOffRate: 50.0},
	}
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			UniqueReaders:    500,
			TopDropOffScenes: dropScenes,
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// drop-off ต้องส่งต่อจาก repo ตรงๆ ไม่แก้ไข
	if len(got.TopDropOffScenes) != 3 {
		t.Fatalf("TopDropOffScenes: want 3, got %d", len(got.TopDropOffScenes))
	}
	for i, want := range dropScenes {
		got := got.TopDropOffScenes[i]
		if got.SceneID != want.SceneID {
			t.Errorf("[%d] SceneID: want %d, got %d", i, want.SceneID, got.SceneID)
		}
		if got.DropOffRate != want.DropOffRate {
			t.Errorf("[%d] DropOffRate: want %.2f, got %.2f", i, want.DropOffRate, got.DropOffRate)
		}
	}
}

// ─── Test: repo error propagation ────────────────────────────────────────

func TestGetNovelOverview_RepoError(t *testing.T) {
	repoErr := errors.New("db connection failed")
	repo := &mockAnalyticsRepo{err: repoErr}

	svc := newTestService(repo)
	_, err := svc.GetNovelOverview(1)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, repoErr) {
		t.Errorf("error: want %v, got %v", repoErr, err)
	}
}

// ─── Test: novel not found (nil stats) ───────────────────────────────────

func TestGetNovelOverview_NovelNotFound(t *testing.T) {
	repo := &mockAnalyticsRepo{result: nil, err: nil}

	svc := newTestService(repo)
	_, err := svc.GetNovelOverview(99999)
	if err == nil {
		t.Fatal("expected ErrNovelNotFound, got nil")
	}
	if !errors.Is(err, service.ErrNovelNotFound) {
		t.Errorf("error: want ErrNovelNotFound, got %v", err)
	}
}

// ─── Test: calcPercentage edge cases ──────────────────────────────────────
// ทดสอบ rounding ผ่าน end-to-end ของ service

func TestGetNovelOverview_RoundingEdgeCases(t *testing.T) {
	tests := []struct {
		name               string
		completed          int64
		unique             int64
		wantCompletionRate float64
	}{
		{"exact division", 50, 100, 50.0},
		{"one third → 33.33%", 1, 3, 33.33},
		{"two thirds → 66.67%", 2, 3, 66.67},
		{"all complete → 100%", 7, 7, 100.0},
		{"single reader complete", 1, 1, 100.0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockAnalyticsRepo{
				result: &models.NovelOverviewStats{
					UniqueReaders:    tc.unique,
					CompletedReaders: tc.completed,
				},
			}
			svc := newTestService(repo)
			got, err := svc.GetNovelOverview(1)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.CompletionRate != tc.wantCompletionRate {
				t.Errorf("CompletionRate: want %.2f, got %.2f", tc.wantCompletionRate, got.CompletionRate)
			}
		})
	}
}

// ─── Choice Analytics Service Unit Tests ────────────────────────────────────

func TestGetSceneChoiceAnalytics_Normal(t *testing.T) {
	repo := &mockAnalyticsRepo{
		choiceResult: &models.SceneChoiceAnalyticsStats{
			SceneID: 10,
			Choices: []models.ChoiceStat{
				{ChoiceID: 1, Label: "เดินเข้าป่า", ToSceneID: 11, TargetSceneTitle: "ป่าทึบ", SelectionCount: 60},
				{ChoiceID: 2, Label: "ข้ามแม่น้ำ", ToSceneID: 12, TargetSceneTitle: "แม่น้ำสายใหญ่", SelectionCount: 40},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(got.Choices) != 2 {
		t.Fatalf("Choices count: want 2, got %d", len(got.Choices))
	}

	// 60/100 -> 60.0%, 40/100 -> 40.0%
	if got.Choices[0].Percentage != 60.0 {
		t.Errorf("Choice[0] percentage: want 60.0, got %.2f", got.Choices[0].Percentage)
	}
	if got.Choices[1].Percentage != 40.0 {
		t.Errorf("Choice[1] percentage: want 40.0, got %.2f", got.Choices[1].Percentage)
	}

	// Top choice should be choice_id 1
	if got.TopChoice == nil {
		t.Fatal("TopChoice: want non-nil, got nil")
	}
	if got.TopChoice.ChoiceID != 1 {
		t.Errorf("TopChoice ChoiceID: want 1, got %d", got.TopChoice.ChoiceID)
	}
	if got.TopChoice.SelectionCount != 60 {
		t.Errorf("TopChoice SelectionCount: want 60, got %d", got.TopChoice.SelectionCount)
	}
}

func TestGetSceneChoiceAnalytics_NoSelections(t *testing.T) {
	repo := &mockAnalyticsRepo{
		choiceResult: &models.SceneChoiceAnalyticsStats{
			SceneID: 10,
			Choices: []models.ChoiceStat{
				{ChoiceID: 1, Label: "ทางเลือก A", SelectionCount: 0},
				{ChoiceID: 2, Label: "ทางเลือก B", SelectionCount: 0},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for i, c := range got.Choices {
		if c.SelectionCount != 0 {
			t.Errorf("Choice[%d] SelectionCount: want 0, got %d", i, c.SelectionCount)
		}
		if c.Percentage != 0.0 {
			t.Errorf("Choice[%d] Percentage: want 0.0, got %.2f", i, c.Percentage)
		}
	}

	if got.TopChoice != nil {
		t.Errorf("TopChoice with no selections: want nil, got %+v", got.TopChoice)
	}
}

func TestGetSceneChoiceAnalytics_OneChoice(t *testing.T) {
	repo := &mockAnalyticsRepo{
		choiceResult: &models.SceneChoiceAnalyticsStats{
			SceneID: 10,
			Choices: []models.ChoiceStat{
				{ChoiceID: 5, Label: "ไปต่อ", SelectionCount: 25},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.Choices[0].Percentage != 100.0 {
		t.Errorf("Percentage: want 100.0, got %.2f", got.Choices[0].Percentage)
	}
	if got.TopChoice == nil || got.TopChoice.ChoiceID != 5 {
		t.Errorf("TopChoice: want choice_id 5, got %+v", got.TopChoice)
	}
}

func TestGetSceneChoiceAnalytics_MultipleChoices(t *testing.T) {
	repo := &mockAnalyticsRepo{
		choiceResult: &models.SceneChoiceAnalyticsStats{
			SceneID: 10,
			Choices: []models.ChoiceStat{
				{ChoiceID: 1, Label: "A", SelectionCount: 10},
				{ChoiceID: 2, Label: "B", SelectionCount: 20},
				{ChoiceID: 3, Label: "C", SelectionCount: 70},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 10%, 20%, 70%
	if got.Choices[0].Percentage != 10.0 || got.Choices[1].Percentage != 20.0 || got.Choices[2].Percentage != 70.0 {
		t.Errorf("Percentages mismatched: got [%.2f, %.2f, %.2f]", got.Choices[0].Percentage, got.Choices[1].Percentage, got.Choices[2].Percentage)
	}

	if got.TopChoice == nil || got.TopChoice.ChoiceID != 3 {
		t.Errorf("TopChoice: want choice_id 3, got %+v", got.TopChoice)
	}
}

func TestGetSceneChoiceAnalytics_TiedTopChoices(t *testing.T) {
	// Choice 2 and Choice 3 both have selection_count = 50.
	// Deterministic tie-break should pick choice_id 2 (smaller ID).
	repo := &mockAnalyticsRepo{
		choiceResult: &models.SceneChoiceAnalyticsStats{
			SceneID: 10,
			Choices: []models.ChoiceStat{
				{ChoiceID: 3, Label: "ทางเลือก C", SelectionCount: 50},
				{ChoiceID: 2, Label: "ทางเลือก B", SelectionCount: 50},
			},
		},
	}

	svc := newTestService(repo)
	got, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.TopChoice == nil {
		t.Fatal("TopChoice: want non-nil, got nil")
	}
	if got.TopChoice.ChoiceID != 2 {
		t.Errorf("Tied top choice tie-break: want choice_id 2 (smaller ID), got choice_id %d", got.TopChoice.ChoiceID)
	}
}

func TestGetSceneChoiceAnalytics_SceneNotBelongingToNovel(t *testing.T) {
	repo := &mockAnalyticsRepo{
		choiceResult: nil,
	}

	svc := newTestService(repo)
	_, err := svc.GetSceneChoiceAnalytics(1, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, service.ErrSceneNotFound) {
		t.Errorf("error: want ErrSceneNotFound, got %v", err)
	}
}

func TestGetSceneChoiceAnalytics_RepoError(t *testing.T) {
	repoErr := errors.New("db query failed")
	repo := &mockAnalyticsRepo{
		err: repoErr,
	}

	svc := newTestService(repo)
	_, err := svc.GetSceneChoiceAnalytics(1, 10)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, repoErr) {
		t.Errorf("error: want %v, got %v", repoErr, err)
	}
}
