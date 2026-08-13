package repository_test

import (
	"testing"

	"novel-be/internal/models"
	"novel-be/internal/repository"
)

// ─── Mock AnalyticsRepository ─────────────────────────────────────────────

// mockAnalyticsRepo เป็น stub ที่ implement AnalyticsRepository interface
// เพื่อทดสอบโดยไม่ต้องใช้ DB จริง
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

// ตรวจสอบว่า mockAnalyticsRepo implement interface ครบ (compile-time check)
var _ repository.AnalyticsRepository = (*mockAnalyticsRepo)(nil)

// ─── Tests: NovelOverviewStats struct ─────────────────────────────────────

func TestNovelOverviewStats_ZeroValue(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{},
	}

	got, err := repo.GetNovelOverview(1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.TotalViews != 0 {
		t.Errorf("TotalViews: want 0, got %d", got.TotalViews)
	}
	if got.UniqueReaders != 0 {
		t.Errorf("UniqueReaders: want 0, got %d", got.UniqueReaders)
	}
	if got.CompletedReaders != 0 {
		t.Errorf("CompletedReaders: want 0, got %d", got.CompletedReaders)
	}
	if got.CompletionRate != 0 {
		t.Errorf("CompletionRate: want 0, got %f", got.CompletionRate)
	}
	if len(got.EndingStats) != 0 {
		t.Errorf("EndingStats: want empty, got len=%d", len(got.EndingStats))
	}
	if len(got.TopDropOffScenes) != 0 {
		t.Errorf("TopDropOffScenes: want empty, got len=%d", len(got.TopDropOffScenes))
	}
}

func TestNovelOverviewStats_WithData(t *testing.T) {
	repo := &mockAnalyticsRepo{
		result: &models.NovelOverviewStats{
			TotalViews:       500,
			UniqueReaders:    100,
			CompletedReaders: 40,
			CompletionRate:   40.0,
			EndingStats: []models.EndingStat{
				{EndingType: "good_ending", Count: 25, Percentage: 25.0},
				{EndingType: "bad_ending", Count: 15, Percentage: 15.0},
			},
			TopDropOffScenes: []models.DropOffScene{
				{SceneID: 10, Title: "ฉากที่ 1", VisitCount: 80, UniqueReaders: 70, DropOffRate: 30.5},
			},
		},
	}

	got, err := repo.GetNovelOverview(99)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.TotalViews != 500 {
		t.Errorf("TotalViews: want 500, got %d", got.TotalViews)
	}
	if got.UniqueReaders != 100 {
		t.Errorf("UniqueReaders: want 100, got %d", got.UniqueReaders)
	}
	if got.CompletedReaders != 40 {
		t.Errorf("CompletedReaders: want 40, got %d", got.CompletedReaders)
	}
	if got.CompletionRate != 40.0 {
		t.Errorf("CompletionRate: want 40.0, got %f", got.CompletionRate)
	}
	if len(got.EndingStats) != 2 {
		t.Fatalf("EndingStats: want 2 items, got %d", len(got.EndingStats))
	}
	if got.EndingStats[0].EndingType != "good_ending" {
		t.Errorf("EndingStats[0].EndingType: want 'good_ending', got '%s'", got.EndingStats[0].EndingType)
	}
	if len(got.TopDropOffScenes) != 1 {
		t.Fatalf("TopDropOffScenes: want 1 item, got %d", len(got.TopDropOffScenes))
	}
	if got.TopDropOffScenes[0].DropOffRate != 30.5 {
		t.Errorf("DropOffRate: want 30.5, got %f", got.TopDropOffScenes[0].DropOffRate)
	}
}

// ─── Tests: EndingStat ────────────────────────────────────────────────────

func TestEndingStat_Fields(t *testing.T) {
	es := models.EndingStat{
		EndingType: "true_ending",
		Count:      5,
		Percentage: 10.0,
	}
	if es.EndingType != "true_ending" {
		t.Errorf("EndingType: want 'true_ending', got '%s'", es.EndingType)
	}
	if es.Count != 5 {
		t.Errorf("Count: want 5, got %d", es.Count)
	}
	if es.Percentage != 10.0 {
		t.Errorf("Percentage: want 10.0, got %f", es.Percentage)
	}
}

// ─── Tests: DropOffScene ──────────────────────────────────────────────────

func TestDropOffScene_Fields(t *testing.T) {
	d := models.DropOffScene{
		SceneID:       42,
		Title:         "บทเปิดตำนาน",
		VisitCount:    300,
		UniqueReaders: 150,
		DropOffRate:   25.33,
	}
	if d.SceneID != 42 {
		t.Errorf("SceneID: want 42, got %d", d.SceneID)
	}
	if d.DropOffRate != 25.33 {
		t.Errorf("DropOffRate: want 25.33, got %f", d.DropOffRate)
	}
}

// ─── Tests: CompletionRate calculation (logic mirrored from repo) ─────────

func TestCompletionRate_Calculation(t *testing.T) {
	tests := []struct {
		name      string
		completed int64
		unique    int64
		wantRate  float64
	}{
		{"zero unique readers → 0%", 0, 0, 0},
		{"all completed → 100%", 50, 50, 100},
		{"half completed → 50%", 25, 50, 50},
		{"one third → 33.33%", 1, 3, 33.33},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var rate float64
			if tc.unique > 0 {
				rate = roundFloat2Test(float64(tc.completed) * 100.0 / float64(tc.unique))
			}
			if rate != tc.wantRate {
				t.Errorf("want %.2f, got %.2f", tc.wantRate, rate)
			}
		})
	}
}

// roundFloat2Test mirrors roundFloat2 ใน analytics_repo.go
// ทดสอบ logic เดียวกันโดยไม่ต้อง export ฟังก์ชัน
func roundFloat2Test(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

// ─── Tests: DropOffRate edge cases ────────────────────────────────────────

func TestDropOffRate_Calculation(t *testing.T) {
	tests := []struct {
		name      string
		visited   int64
		continued int64
		wantRate  float64
	}{
		{"no one continued → 100% drop-off", 10, 0, 100},
		{"all continued → 0% drop-off", 10, 10, 0},
		{"half continued → 50% drop-off", 10, 5, 50},
		{"ending scene: visited 0 → skip", 0, 0, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var rate float64
			if tc.visited > 0 {
				rate = roundFloat2Test(float64(tc.visited-tc.continued) * 100.0 / float64(tc.visited))
			}
			if rate != tc.wantRate {
				t.Errorf("want %.2f, got %.2f", tc.wantRate, rate)
			}
		})
	}
}
