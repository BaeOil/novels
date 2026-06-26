package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"novel-be/internal/dto"
	"novel-be/internal/middleware"
	"novel-be/internal/service"
)

type AuthHandler struct {
	authService  *service.AuthService
	mediaService service.MediaService
}

func NewAuthHandler(as *service.AuthService, ms service.MediaService) *AuthHandler {
	return &AuthHandler{authService: as, mediaService: ms}
}

// 📝 1. ท่อสมัครสมาชิก (Register) - รับ Multipart Form เผื่อการอัปโหลดรูปภาพ
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// จำกัดขนาดไฟล์รูปโปรไฟล์รวมไม่เกิน 5MB
	err := r.ParseMultipartForm(5 << 20)
	if err != nil {
		http.Error(w, "รูปภาพขนาดใหญ่เกินไป (จำกัด 5MB)", http.StatusBadRequest)
		return
	}

	// แกะข้อมูลตัวอักษรจาก Form-Data เข้าสู่ DTO
	req := dto.RegisterRequest{
		Username: r.FormValue("username"),
		Email:    r.FormValue("email"),
		Password: r.FormValue("password"),
	}

	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	avatarURL := ""
	file, handler, err := r.FormFile("profileImage")
	if err != nil && err != http.ErrMissingFile {
		http.Error(w, "ไม่สามารถอ่านไฟล์รูปภาพได้", http.StatusBadRequest)
		return
	}
	if err == nil {
		defer file.Close()

		uploadedURL, uploadErr := h.mediaService.UploadImage(r.Context(), handler)
		if uploadErr != nil {
			http.Error(w, "ไม่สามารถอัปโหลดรูปภาพได้: "+uploadErr.Error(), http.StatusBadRequest)
			return
		}
		avatarURL = uploadedURL
	}

	res, err := h.authService.Register(r.Context(), req, avatarURL)
	if err != nil {
		http.Error(w, "สมัครสมาชิกไม่สำเร็จ: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

// 🔑 2. ท่อเข้าสู่ระบบ (Login) - รับข้อมูลรูปแบบ JSON
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req dto.LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "รูปแบบข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "กรุณากรอกอีเมลและรหัสผ่าน", http.StatusBadRequest)
		return
	}

	// เรียกใช้งาน Service ตัวจริง เพื่อเช็คข้อมูลใน DB และออก JWT Token ตัวจริง
	res, err := h.authService.Login(r.Context(), req)
	if err != nil {
		// หากรหัสผิดหรือหาไม่เจอ จะเด้งข้อความแจ้งเตือนสีแดงออกไป
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// พ่นข้อมูลตั๋วพร้อมรายละเอียดประวัติผู้ใช้กลับไปให้หน้าบ้านจัดเก็บลง LocalStorage/Cookie
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

// � 3. ท่อรีเฟรชโทเค็น (Refresh Token)
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req dto.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "รูปแบบข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	res, err := h.authService.RefreshToken(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

// 🔓 4. ท่อออกจากระบบ (Logout) - ปิดเซสชันฝั่ง frontend
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ในระบบ JWT ปัจจุบัน เราใช้ token แบบ stateless จึงไม่มีการเก็บสถานะเซสชันใน server
	// endpoint นี้ออกแบบมาให้ frontend เรียกแล้วตอบว่าออกจากระบบสำเร็จ
	// ส่วนการล้าง token จะต้องทำที่ฝั่ง client (เช่น localStorage.removeItem('token'))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "ออกจากระบบเรียบร้อยแล้ว",
	})
}

// 👤 4. ท่อดึงข้อมูลผู้ใช้ปัจจุบัน (Get Current User) - ต้องมี Token ที่ถูกต้อง
func (h *AuthHandler) GetUserInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ดึง user_id จาก Context (ถูกใส่โดย RequireAuth middleware)
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok || userID == 0 {
		http.Error(w, "ไม่สามารถตรวจสอบตัวตนผู้ใช้ได้", http.StatusUnauthorized)
		return
	}

	// เรียก Service ตัวจริงเพื่อดึงข้อมูลผู้ใช้จากฐานข้อมูล
	user, err := h.authService.GetUserByID(r.Context(), userID)
	if err != nil {
		fmt.Printf("❌ ERROR in GetUserByID: %v\n", err)
		http.Error(w, "ไม่สามารถดึงข้อมูลผู้ใช้ได้: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if user == nil {
		fmt.Printf("❌ ERROR: User not found for ID: %d\n", uint(userID))
		http.Error(w, "ไม่พบข้อมูลผู้ใช้งาน", http.StatusNotFound)
		return
	}

	fmt.Printf("✅ DEBUG: User found - ID: %d, Username: %s, Email: %s\n", user.ID, user.Username, user.Email)

	// ตอบกลับข้อมูลผู้ใช้โดยไม่ให้ password hash
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": map[string]interface{}{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"pic_profile": user.PicProfile,
			"role":        user.Role,
		},
	})
}
