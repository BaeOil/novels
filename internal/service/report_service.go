package service

import (
	"context"
	"errors"
	"novel-be/internal/dto"
	"novel-be/internal/models"
	"novel-be/internal/repository"
)

type ReportService interface {
	CreateReport(ctx context.Context, userID int, req dto.CreateReportRequest) error
	GetPendingReports(ctx context.Context) ([]dto.ReportResponse, error)
	GetReportStatus(ctx context.Context, reportID int) (string, error)
	UpdateReportStatus(ctx context.Context, reportID int, req dto.UpdateReportStatusRequest) error
	CreateAppeal(ctx context.Context, userID int, req dto.CreateAppealRequest) error
}

type reportService struct {
	repo repository.ReportRepository
}

func NewReportService(repo repository.ReportRepository) ReportService {
	return &reportService{repo: repo}
}

// 📌 1. สร้างรีพอร์ต (ฝั่งคนอ่าน)
func (s *reportService) CreateReport(ctx context.Context, userID int, req dto.CreateReportRequest) error {
	if req.NovelID <= 0 {
		return errors.New("invalid novel ID")
	}
	if req.Reason == "" {
		return errors.New("reason is required")
	}

	report := models.Report{
		UserID:  userID,
		NovelID: req.NovelID,
		Reason:  req.Reason,
	}

	return s.repo.CreateReport(ctx, report)
}

// 📌 2. ดึงรีพอร์ตให้แอดมินดู
func (s *reportService) GetPendingReports(ctx context.Context) ([]dto.ReportResponse, error) {
	return s.repo.GetPendingReports(ctx)
}

// 📌 3. อัปเดตสถานะรีพอร์ต (ฝั่งแอดมิน)
func (s *reportService) UpdateReportStatus(ctx context.Context, reportID int, req dto.UpdateReportStatusRequest) error {
	// ป้องกันแอดมินส่งสถานะมั่วๆ เข้ามา
	if req.Status != "resolved" && req.Status != "rejected" && req.Status != "pending" {
		return errors.New("invalid status, must be resolved or rejected")
	}

	return s.repo.UpdateReportStatus(ctx, reportID, req.Status)
}

func (s *reportService) CreateAppeal(ctx context.Context, userID int, req dto.CreateAppealRequest) error {
	if req.NovelID <= 0 {
		return errors.New("invalid novel ID")
	}
	if req.Reason == "" {
		return errors.New("appeal reason is required")
	}

	// เรียกใช้งาน repository
	return s.repo.CreateAppeal(ctx, userID, req)
}

func (s *reportService) GetReportStatus(ctx context.Context, reportID int) (string, error) {
	return s.repo.GetStatus(ctx, reportID)
}
