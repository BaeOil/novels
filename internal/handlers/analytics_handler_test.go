package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"novel-be/internal/dto"
	"novel-be/internal/handlers"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
)

// ─── Mocks ───────────────────────────────────────────────────────────────────

type mockAnalyticsService struct {
	stats       *models.NovelOverviewStats
	sceneStats  *models.SceneAnalyticsStats
	choiceStats *models.SceneChoiceAnalyticsStats
	err         error
}

func (m *mockAnalyticsService) GetNovelOverview(novelID int) (*models.NovelOverviewStats, error) {
	return m.stats, m.err
}

func (m *mockAnalyticsService) GetSceneAnalytics(novelID, sceneID int) (*models.SceneAnalyticsStats, error) {
	return m.sceneStats, m.err
}

func (m *mockAnalyticsService) GetSceneChoiceAnalytics(novelID, sceneID int) (*models.SceneChoiceAnalyticsStats, error) {
	return m.choiceStats, m.err
}

type mockNovelService struct {
	service.NovelService
	novelDetail interface{}
	err         error
}

func (m *mockNovelService) GetNovelDetail(id int) (interface{}, error) {
	return m.novelDetail, m.err
}

type mockWriterService struct {
	service.WriterService
	writer *models.Writer
	err    error
}

func (m *mockWriterService) GetWriterByUserID(userID int) (*models.Writer, error) {
	return m.writer, m.err
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func setupContext(userID uint, role string) context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.RoleKey, role)
	return ctx
}

// ─── Novel Analytics Handler Tests ──────────────────────────────────────────

func TestNovelAnalyticsHandler_OwnerWriter_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		stats: &models.NovelOverviewStats{
			TotalViews:       500,
			UniqueReaders:    100,
			CompletedReaders: 40,
			CompletionRate:   40.0,
		},
	}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10,
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 10,
			UserID:   100,
		},
	}

	handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics", nil)
	req = req.WithContext(setupContext(100, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
	if resp.Message != "success" {
		t.Errorf("resp.Message: want 'success', got '%s'", resp.Message)
	}
}

func TestNovelAnalyticsHandler_Admin_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		stats: &models.NovelOverviewStats{
			TotalViews:       1000,
			UniqueReaders:    200,
			CompletedReaders: 100,
			CompletionRate:   50.0,
		},
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
}

func TestNovelAnalyticsHandler_NonOwnerWriter_Forbidden(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10, // Owner is writer_id 10
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 20, // Current user is writer_id 20
			UserID:   200,
		},
	}

	handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics", nil)
	req = req.WithContext(setupContext(200, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status: want 403, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 403 {
		t.Errorf("resp.Status: want 403, got %d", resp.Status)
	}
}

func TestNovelAnalyticsHandler_InvalidNovelID_BadRequest(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	invalidPaths := []string{
		"/api/v1/writer/novels/abc/analytics",
		"/api/v1/writer/novels/0/analytics",
		"/api/v1/writer/novels/-5/analytics",
	}

	for _, path := range invalidPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req = req.WithContext(setupContext(100, "admin"))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("path %s: status want 400, got %d", path, rec.Code)
			}

			var resp dto.ErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}
			if resp.Status != 400 {
				t.Errorf("resp.Status: want 400, got %d", resp.Status)
			}
		})
	}
}

func TestNovelAnalyticsHandler_NovelNotFound_NotFound(t *testing.T) {
	t.Run("GetNovelDetail error", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{}
		novelSvc := &mockNovelService{
			err: errors.New("novel not found"),
		}
		writerSvc := &mockWriterService{
			writer: &models.Writer{WriterID: 10, UserID: 100},
		}

		handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/999/analytics", nil)
		req = req.WithContext(setupContext(100, "writer"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})

	t.Run("AnalyticsService ErrNovelNotFound", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{
			err: service.ErrNovelNotFound,
		}
		novelSvc := &mockNovelService{}
		writerSvc := &mockWriterService{}

		handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/999/analytics", nil)
		req = req.WithContext(setupContext(999, "admin"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})
}

func TestNovelAnalyticsHandler_ServiceError_InternalServerError(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		err: errors.New("unexpected database failure"),
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.NovelAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status: want 500, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 500 {
		t.Errorf("resp.Status: want 500, got %d", resp.Status)
	}
}

// ─── Scene Analytics Handler Tests ──────────────────────────────────────────

func TestSceneAnalyticsHandler_OwnerWriter_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		sceneStats: &models.SceneAnalyticsStats{
			SceneID:          5,
			Title:            "ฉากประตูวิเศษ",
			VisitCount:       120,
			UniqueReaders:    80,
			RepeatVisitCount: 40,
			DropOffRate:      10.0,
		},
	}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10,
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 10,
			UserID:   100,
		},
	}

	handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5", nil)
	req = req.WithContext(setupContext(100, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
	if resp.Message != "success" {
		t.Errorf("resp.Message: want 'success', got '%s'", resp.Message)
	}
}

func TestSceneAnalyticsHandler_Admin_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		sceneStats: &models.SceneAnalyticsStats{
			SceneID:       5,
			Title:         "ฉากประตูวิเศษ",
			VisitCount:    100,
			UniqueReaders: 70,
		},
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
}

func TestSceneAnalyticsHandler_NonOwnerWriter_Forbidden(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10,
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 20, // Not owner
			UserID:   200,
		},
	}

	handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5", nil)
	req = req.WithContext(setupContext(200, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status: want 403, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 403 {
		t.Errorf("resp.Status: want 403, got %d", resp.Status)
	}
}

func TestSceneAnalyticsHandler_InvalidIDs_BadRequest(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	invalidPaths := []string{
		"/api/v1/writer/novels/abc/analytics/scenes/5",
		"/api/v1/writer/novels/1/analytics/scenes/xyz",
		"/api/v1/writer/novels/0/analytics/scenes/5",
		"/api/v1/writer/novels/1/analytics/scenes/-10",
		"/invalid/path/format",
	}

	for _, path := range invalidPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req = req.WithContext(setupContext(999, "admin"))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("path %s: status want 400, got %d", path, rec.Code)
			}

			var resp dto.ErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}
			if resp.Status != 400 {
				t.Errorf("resp.Status: want 400, got %d", resp.Status)
			}
		})
	}
}

func TestSceneAnalyticsHandler_SceneNotFound_NotFound(t *testing.T) {
	t.Run("GetNovelDetail error", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{}
		novelSvc := &mockNovelService{
			err: errors.New("novel not found"),
		}
		writerSvc := &mockWriterService{
			writer: &models.Writer{WriterID: 10, UserID: 100},
		}

		handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/999/analytics/scenes/5", nil)
		req = req.WithContext(setupContext(100, "writer"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})

	t.Run("AnalyticsService ErrSceneNotFound", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{
			err: service.ErrSceneNotFound,
		}
		novelSvc := &mockNovelService{}
		writerSvc := &mockWriterService{}

		handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/999", nil)
		req = req.WithContext(setupContext(999, "admin"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})
}

func TestSceneAnalyticsHandler_ServiceError_InternalServerError(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		err: errors.New("unexpected database error"),
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status: want 500, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 500 {
		t.Errorf("resp.Status: want 500, got %d", resp.Status)
	}
}

// ─── Scene Choice Analytics Handler Unit Tests ──────────────────────────────

func TestSceneChoiceAnalyticsHandler_OwnerWriter_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		choiceStats: &models.SceneChoiceAnalyticsStats{
			SceneID: 5,
			Choices: []models.ChoiceStat{
				{ChoiceID: 10, Label: "ทางเลือก A", ToSceneID: 6, TargetSceneTitle: "ฉากถัดไป", SelectionCount: 100, Percentage: 100.0},
			},
			TopChoice: &models.TopChoiceStat{ChoiceID: 10, Label: "ทางเลือก A", SelectionCount: 100, Percentage: 100.0},
		},
	}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10,
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 10,
			UserID:   100,
		},
	}

	handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5/choices", nil)
	req = req.WithContext(setupContext(100, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
	if resp.Message != "success" {
		t.Errorf("resp.Message: want 'success', got '%s'", resp.Message)
	}
}

func TestSceneChoiceAnalyticsHandler_Admin_Success(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		choiceStats: &models.SceneChoiceAnalyticsStats{
			SceneID: 5,
			Choices: []models.ChoiceStat{},
		},
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5/choices", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}

	var resp dto.SuccessResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 200 {
		t.Errorf("resp.Status: want 200, got %d", resp.Status)
	}
}

func TestSceneChoiceAnalyticsHandler_NonOwner_Forbidden(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{
		novelDetail: &models.Novel{
			ID:       1,
			AuthorID: 10,
		},
	}
	writerSvc := &mockWriterService{
		writer: &models.Writer{
			WriterID: 20, // Not owner
			UserID:   200,
		},
	}

	handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5/choices", nil)
	req = req.WithContext(setupContext(200, "writer"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status: want 403, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 403 {
		t.Errorf("resp.Status: want 403, got %d", resp.Status)
	}
}

func TestSceneChoiceAnalyticsHandler_InvalidIDs_BadRequest(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	invalidPaths := []string{
		"/api/v1/writer/novels/abc/analytics/scenes/5/choices",
		"/api/v1/writer/novels/1/analytics/scenes/xyz/choices",
		"/api/v1/writer/novels/0/analytics/scenes/5/choices",
		"/api/v1/writer/novels/1/analytics/scenes/-5/choices",
		"/invalid/choice/path",
	}

	for _, path := range invalidPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req = req.WithContext(setupContext(999, "admin"))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("path %s: status want 400, got %d", path, rec.Code)
			}

			var resp dto.ErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}
			if resp.Status != 400 {
				t.Errorf("resp.Status: want 400, got %d", resp.Status)
			}
		})
	}
}

func TestSceneChoiceAnalyticsHandler_SceneNotFound_NotFound(t *testing.T) {
	t.Run("GetNovelDetail error", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{}
		novelSvc := &mockNovelService{
			err: errors.New("novel not found"),
		}
		writerSvc := &mockWriterService{
			writer: &models.Writer{WriterID: 10, UserID: 100},
		}

		handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/999/analytics/scenes/5/choices", nil)
		req = req.WithContext(setupContext(100, "writer"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})

	t.Run("AnalyticsService ErrSceneNotFound", func(t *testing.T) {
		analyticsSvc := &mockAnalyticsService{
			err: service.ErrSceneNotFound,
		}
		novelSvc := &mockNovelService{}
		writerSvc := &mockWriterService{}

		handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/999/choices", nil)
		req = req.WithContext(setupContext(999, "admin"))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status: want 404, got %d", rec.Code)
		}
	})
}

func TestSceneChoiceAnalyticsHandler_ServiceError_InternalServerError(t *testing.T) {
	analyticsSvc := &mockAnalyticsService{
		err: errors.New("unexpected repo failure"),
	}
	novelSvc := &mockNovelService{}
	writerSvc := &mockWriterService{}

	handler := handlers.SceneChoiceAnalyticsHandler(analyticsSvc, novelSvc, writerSvc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/writer/novels/1/analytics/scenes/5/choices", nil)
	req = req.WithContext(setupContext(999, "admin"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status: want 500, got %d", rec.Code)
	}

	var resp dto.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != 500 {
		t.Errorf("resp.Status: want 500, got %d", resp.Status)
	}
}
