package handlers

import (
	"encoding/json"
	"net/http"
	"novel-be/internal/dto"
)

// --- 1. ฟังก์ชันมาตรฐาน (New Standard) ---

// RespondWithJSON สำหรับการส่งข้อมูลกลับแบบปกติ
func RespondWithJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := dto.SuccessResponse{
		Status:  statusCode,
		Data:    data,
		Message: "success",
	}
	json.NewEncoder(w).Encode(response)
}

// RespondWithError สำหรับการแจ้ง Error แบบละเอียด (4 parameters)
func RespondWithError(w http.ResponseWriter, statusCode int, message string, err string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := dto.ErrorResponse{
		Status:  statusCode,
		Error:   err,
		Message: message,
	}
	json.NewEncoder(w).Encode(response)
}

// --- 2. ฟังก์ชันตัวเชื่อม (Adapters) เพื่อให้ Compile ผ่านทุกไฟล์ ---

// RespondWithCreated แก้ปัญหาที่นายเจอใน get_handlers.go:222 
// โดยรับ String (Message) และ Data (interface{}) ตามที่ Handler เรียกมา
func RespondWithCreated(w http.ResponseWriter, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	response := dto.SuccessResponse{
		Status:  http.StatusCreated,
		Data:    data,
		Message: message,
	}
	json.NewEncoder(w).Encode(response)
}

// WriteJSON เชื่อมโยงโค้ดเก่าที่เรียกใช้ WriteJSON ให้มาใช้มาตรฐานใหม่
func WriteJSON(w http.ResponseWriter, status int, payload interface{}) {
	RespondWithJSON(w, status, payload)
}

// WriteError เชื่อมโยงโค้ดเก่าที่เรียกใช้ WriteError ให้มาใช้มาตรฐานใหม่
func WriteError(w http.ResponseWriter, status int, message string) {
	RespondWithError(w, status, message, "")
}

// RespondWithError3 (Optional) สำหรับกรณีที่มีการเรียก RespondWithError แบบ 3 ตัวแปร
func RespondWithError3(w http.ResponseWriter, statusCode int, message string) {
	RespondWithError(w, statusCode, message, "")
}