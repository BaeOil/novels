package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"novel-be/internal/dto"
	"novel-be/internal/middleware"
	"novel-be/internal/repository"
	"novel-be/internal/service"
)

type AdminUserHandler struct {
	authService service.AuthService
}

func NewAdminUserHandler(authService service.AuthService) *AdminUserHandler {
	return &AdminUserHandler{authService: authService}
}

func (h *AdminUserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	role := strings.TrimSpace(r.URL.Query().Get("role"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	users, err := h.authService.ListUsers(r.Context(), role, status, search, page, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"users": users})
}

func (h *AdminUserHandler) GetUserDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	userID, err := strconv.Atoi(pathID)
	if err != nil || userID <= 0 {
		http.Error(w, "รหัสผู้ใช้ไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	user, err := h.authService.GetUserForAdmin(r.Context(), uint(userID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if user == nil {
		http.Error(w, "ไม่พบผู้ใช้งาน", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *AdminUserHandler) UpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	pathID = strings.TrimSuffix(pathID, "/status")
	userID, err := strconv.Atoi(pathID)
	if err != nil || userID <= 0 {
		http.Error(w, "รหัสผู้ใช้ไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	adminID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || adminID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Status string  `json:"status"`
		Reason *string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "รูปแบบข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}
	if req.Status != "active" && req.Status != "suspended" {
		http.Error(w, "status ต้องเป็น active หรือ suspended เท่านั้น", http.StatusBadRequest)
		return
	}

	var suspendedAt *time.Time
	if req.Status == "suspended" {
		now := time.Now().UTC()
		suspendedAt = &now
	}

	if uint(userID) == adminID {
		http.Error(w, "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้", http.StatusForbidden)
		return
	}

	reason := ""
	if req.Reason != nil {
		reason = strings.TrimSpace(*req.Reason)
	}

	err = h.authService.UpdateUserStatus(r.Context(), uint(userID), req.Status, reason, suspendedAt, adminID)
	if err != nil {
		if strings.Contains(err.Error(), "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "อัปเดตสถานะผู้ใช้สำเร็จแล้ว"})
}

func (h *AdminUserHandler) DemoteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	pathID = strings.TrimSuffix(pathID, "/demote")
	userID, err := strconv.Atoi(pathID)
	if err != nil || userID <= 0 {
		http.Error(w, "รหัสผู้ใช้ไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	adminID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || adminID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if uint(userID) == adminID {
		http.Error(w, "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้", http.StatusForbidden)
		return
	}

	err = h.authService.DemoteUserToReader(r.Context(), uint(userID), adminID)
	if err != nil {
		if strings.Contains(err.Error(), "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ย้ายสถานะผู้ใช้เป็น reader สำเร็จแล้ว"})
}

func (h *AdminUserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	userID, err := strconv.Atoi(pathID)
	if err != nil || userID <= 0 {
		http.Error(w, "รหัสผู้ใช้ไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	adminID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || adminID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if uint(userID) == adminID {
		http.Error(w, "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้", http.StatusForbidden)
		return
	}

	hasWriterNovels, err := h.authService.HasWriterNovels(r.Context(), uint(userID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if hasWriterNovels {
		http.Error(w, "ต้องระงับบัญชีแทนการลบ เนื่องจากมีนิยายอยู่ในระบบ", http.StatusConflict)
		return
	}

	err = h.authService.DeleteUser(r.Context(), uint(userID), adminID)
	if err != nil {
		if strings.Contains(err.Error(), "ไม่สามารถดำเนินการกับบัญชีของตัวเองได้") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if errors.Is(err, errors.New("must not delete")) {
			http.Error(w, "ต้องระงับบัญชีแทนการลบ เนื่องจากมีนิยายอยู่ในระบบ", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ลบผู้ใช้สำเร็จแล้ว"})
}

func (h *AdminUserHandler) AdminUpdateUsername(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	pathID = strings.TrimPrefix(pathID, "/admin/users/")
	pathID = strings.TrimSuffix(pathID, "/username")
	userID, err := strconv.Atoi(pathID)
	if err != nil || userID <= 0 {
		http.Error(w, "รหัสผู้ใช้ไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	adminID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || adminID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req dto.UpdateUsernameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "รูปแบบข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	err = h.authService.UpdateUsername(r.Context(), uint(userID), req.Username)
	if err != nil {
		if errors.Is(err, repository.ErrUsernameTaken) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		if err.Error() == "user not found" {
			http.Error(w, "ไม่พบผู้ใช้งาน", http.StatusNotFound)
			return
		}
		if err.Error() == "username is required" ||
			err.Error() == "username length must be between 3 and 50 characters" ||
			err.Error() == "username must contain only letters, numbers, and underscores" {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "username updated successfully"})
}
