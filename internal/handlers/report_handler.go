package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"novel-be/internal/dto"
	"novel-be/internal/middleware" 
	"novel-be/internal/service"
)

type ReportHandler struct {
	service service.ReportService
}

func NewReportHandler(service service.ReportService) *ReportHandler {
	return &ReportHandler{service: service}
}

// 📌 1. API: รับรีพอร์ตจากคนอ่าน
func (h *ReportHandler) CreateReport(w http.ResponseWriter, r *http.Request) {
	// 🟢 ดึง userID จริงผ่าน Helper Function ของ Middleware (แปลงเป็น int เพื่อส่งต่อให้ service)
	userIDUint, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || userIDUint == 0 {
		http.Error(w, "unauthorized: invalid or missing user token", http.StatusUnauthorized)
		return
	}
	userID := int(userIDUint)

	var req dto.CreateReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.CreateReport(r.Context(), userID, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "report created successfully"})
}

// 📌 2. API: ดึงรายการรีพอร์ตให้แอดมิน
func (h *ReportHandler) GetPendingReports(w http.ResponseWriter, r *http.Request) {
	reports, err := h.service.GetPendingReports(r.Context())
	if err != nil {
		http.Error(w, "failed to get reports", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

// 📌 3. API: แอดมินกดเปลี่ยนสถานะรีพอร์ต
func (h *ReportHandler) UpdateReportStatus(w http.ResponseWriter, r *http.Request) {
	// 🟢 1. ตรวจสอบว่าต้องเป็น PATCH Method เท่านั้น
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 🟢 2. ดึง report_id จาก URL Path (เช่น ตัด /api/admin/reports/ และ /status ออก)
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/reports/")
	idStr := strings.TrimSuffix(path, "/status")

	reportID, err := strconv.Atoi(idStr)
	if err != nil || reportID <= 0 {
		http.Error(w, "invalid report ID", http.StatusBadRequest)
		return
	}

	var req dto.UpdateReportStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.UpdateReportStatus(r.Context(), reportID, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "status updated successfully"})
}

// 📌 4. API: รับเรื่องขอปลดแบนจากนักเขียน (POST /api/writer/novels/appeal)
func (h *ReportHandler) CreateAppeal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ดึง userID ของนักเขียนจาก Token
	userIDUint, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || userIDUint == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req dto.CreateAppealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.NovelID <= 0 || req.Reason == "" {
		http.Error(w, "novel_id and reason are required", http.StatusBadRequest)
		return
	}

	if err := h.service.CreateAppeal(r.Context(), int(userIDUint), req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "appeal submitted successfully"})
}