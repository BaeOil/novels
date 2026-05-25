package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"novel-be/internal/dto"
	"novel-be/internal/middleware"
	"novel-be/internal/service"
	"strconv"
	"strings"
)

type WriterHandler struct {
	// 🟢 แก้ไขตรงนี้: ถอดเครื่องหมาย * (Pointer) ออก เพื่อให้เรียกใช้ผ่าน Interface โดยตรงตามมาตรฐานโปรเจกต์
	service service.WriterService
}

func NewWriterHandler(s service.WriterService) *WriterHandler {
	// 🟢 แก้ไขตรงนี้: รับเข้ามาเป็น Interface แล้วส่งมอบให้โครงสร้างเรียกใช้ได้เลย ไม่ต้องใส่ & นำหน้าแล้วค่ะ
	return &WriterHandler{service: s}
}

// ✍️ 1. ท่อยื่นคำขอเป็นนักเขียน -> POST /api/writers/apply
func (h *WriterHandler) Apply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || userID == 0 {
		http.Error(w, "unauthorized: ไม่พบข้อมูลผู้ใช้งานใน token", http.StatusUnauthorized)
		return
	}

	var req dto.WriterApplyRequest
	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, "ไม่สามารถประมวลผลข้อมูลจากฟอร์มได้", http.StatusBadRequest)
			return
		}

		req = dto.WriterApplyRequest{
			NameLastname:    r.FormValue("full_name"),
			PenName:         r.FormValue("pen_name"),
			Bio:             r.FormValue("bio"),
			EmailWriter:     r.FormValue("email"),
			ContactRequired: r.FormValue("main_contact"),
			ContactOptional: r.FormValue("other_links"),
		}

		if genresValue := r.FormValue("genres"); genresValue != "" {
			_ = json.Unmarshal([]byte(genresValue), &req.Genres)
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "รูปแบบข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
			return
		}
	}

	if err := h.service.ApplyForWriter(r.Context(), uint(userID), req); err != nil {
		statusCode := http.StatusInternalServerError
		if errors.Is(err, service.ErrAlreadyWriter) {
			statusCode = http.StatusForbidden
		} else if errors.Is(err, service.ErrAlreadyApply) {
			statusCode = http.StatusBadRequest
		}
		http.Error(w, err.Error(), statusCode)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ส่งคำขอสมัครเป็นนักเขียนสำเร็จแล้ว รอแอดมินตรวจสอบนะคะ"})
}

// 👑 2. แอดมินดึงข้อมูลคำขอค้างตรวจสอบทั้งหมด -> GET /api/admin/writers/requests
func (h *WriterHandler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	requests, err := h.service.GetPendingRequests(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// ✅ 3. แอดมินกดยืนยันอนุมัตินักเขียน -> POST /api/admin/writers/approve
func (h *WriterHandler) Approve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writerIDStr := r.URL.Query().Get("writer_id")
	if writerIDStr == "" {
		http.Error(w, "ขาดข้อมูลรหัสคำขอนักเขียน (writer_id)", http.StatusBadRequest)
		return
	}
	writerID, _ := strconv.Atoi(writerIDStr)

	if err := h.service.ApproveWriter(r.Context(), uint(writerID)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "อนุมัตินักเขียนเรียบร้อยแล้ว ยูสเซอร์ดังกล่าวพร้อมเขียนนิยายแล้วค่ะ!"})
}

func (h *WriterHandler) GetApplicationStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || userID == 0 {
		http.Error(w, "unauthorized: ไม่พบข้อมูลผู้ใช้งานใน token", http.StatusUnauthorized)
		return
	}

	writer, err := h.service.GetLatestWriterApplicationByUserID(int(userID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"status": "none"})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    writer.Status,
		"writer_id": writer.WriterID,
		"pen_name":  writer.PenName,
	})
}

func (h *WriterHandler) Reject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ดึง writer_id จาก Query Parameter (?writer_id=1)
	writerIDStr := r.URL.Query().Get("writer_id")
	if writerIDStr == "" {
		http.Error(w, "Missing writer_id", http.StatusBadRequest)
		return
	}

	// แปลงข้อความเป็นตัวเลข
	var writerID uint
	_, err := fmt.Sscanf(writerIDStr, "%d", &writerID)
	if err != nil {
		http.Error(w, "Invalid writer_id format", http.StatusBadRequest)
		return
	}

	// เรียกใช้งานฝั่ง Service
	err = h.service.RejectWriter(r.Context(), writerID)
	if err != nil {
		http.Error(w, "Failed to reject writer: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ส่งข้อความตอบกลับหน้าบ้าน
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "ปฏิเสธคำขอสมัครนักเขียนเรียบร้อยแล้วค่ะ",
	})
}
