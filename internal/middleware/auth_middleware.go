package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"novel-be/internal/dto"
)

// สร้างประเภทข้อมูลพิเศษสำหรับใช้เป็น Key ใน Context เพื่อความปลอดภัยไม่ให้ชนกับอันอื่น
type contextKey string

const (
	UserIDKey contextKey = "user_id"
	RoleKey   contextKey = "role"
)

// jwtSecret ต้องมาจาก env var JWT_SECRET เสมอในโปรดักชัน
// ของเดิม hardcode ค่าไว้ในซอร์สโค้ดตรงๆ — ใครก็เห็น repo (leak/public) ก็ปลอม token
// เป็น role admin ได้ทันที นี่คือช่องโหว่ร้ายแรงที่สุดในไฟล์นี้
var jwtSecret = loadJWTSecret()

// UnauthorizedRecorder คือ signature ของฟังก์ชันที่ใช้บันทึก audit log เวลามีการเข้าถึงโดยไม่มีสิทธิ์
// ใช้ function type แทนการ import "novel-be/internal/service" ตรงๆ เพราะ service package (audit_service.go)
// import middleware package อยู่แล้ว — ถ้า middleware import service กลับไปด้วยจะเกิด import cycle ทันที
// วิธีนี้ทำให้ middleware ไม่ต้องรู้จัก service.AuditService เลย แค่รู้จัก signature ฟังก์ชันนี้พอ
type UnauthorizedRecorder func(r *http.Request, reason string, attemptedRole string, userID uint, hasUserID bool)

var unauthorizedRecorder UnauthorizedRecorder

// SetUnauthorizedRecorder ให้ main.go เรียกตอน startup ครั้งเดียว เพื่อผูก audit service เข้ากับ middleware
// เช่น middleware.SetUnauthorizedRecorder(func(r *http.Request, reason, role string, uid uint, hasUID bool) {
//     var actor *uint
//     if hasUID { actor = &uid }
//     _ = auditService.RecordWithActor(r.Context(), actor, role, service.AuditEvent{
//         Action: "UNAUTHORIZED_ACCESS", TargetType: "route", Status: "FAILURE",
//         Metadata: map[string]interface{}{"path": r.URL.Path, "reason": reason},
//     })
// })
func SetUnauthorizedRecorder(fn UnauthorizedRecorder) {
	unauthorizedRecorder = fn
}

// recordUnauthorized เรียก recorder แบบ non-blocking (goroutine) กัน audit write ช้าไปดึงเวลา response
// ใส่ recover กันไม่ให้ panic ใน audit logging ทำให้ request หลักพังไปด้วย
func recordUnauthorized(r *http.Request, reason string, attemptedRole string) {
	if unauthorizedRecorder == nil {
		return
	}
	userID, hasUserID := GetUserIDFromContext(r.Context())
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("audit log (unauthorized) recorder panic: %v", rec)
			}
		}()
		unauthorizedRecorder(r, reason, attemptedRole, userID, hasUserID)
	}()
}

func loadJWTSecret() []byte {
	if s := strings.TrimSpace(os.Getenv("JWT_SECRET")); s != "" {
		return []byte(s)
	}
	// fallback นี้มีไว้กันแอปพังตอน deploy ครั้งแรกที่ยังไม่ได้ตั้ง env เท่านั้น
	// ห้ามปล่อยให้รันแบบนี้ใน production เด็ดขาด — ตั้ง JWT_SECRET ให้เป็นค่าสุ่มยาวๆ แล้ว rotate token เดิมทั้งหมดทิ้ง (บังคับ re-login)
	log.Println("⚠️  WARNING: JWT_SECRET env var ไม่ได้ตั้งค่า — กำลังใช้ fallback secret ที่ไม่ปลอดภัย ห้ามใช้ค่านี้ใน production!")
	return []byte("my-super-secret-novel-key")
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		tokenString := extractBearerToken(authHeader)
		if tokenString == "" {
			tokenString = r.URL.Query().Get("token")
		}
		if tokenString == "" {
			recordUnauthorized(r, "missing_token", "")
			http.Error(w, "ไม่พบบัตรผ่าน (Token) กรุณาเข้าสู่ระบบค่ะ", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			recordUnauthorized(r, "invalid_or_expired_token", "")
			http.Error(w, "บัตรผ่านไม่ถูกต้อง หรือหมดอายุแล้ว", http.StatusUnauthorized)
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			ctx := context.WithValue(r.Context(), UserIDKey, claims["user_id"])
			ctx = context.WithValue(ctx, RoleKey, claims["role"])
			r = r.WithContext(ctx)
		}

		next.ServeHTTP(w, r)
	})
}

func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		tokenString := extractBearerToken(authHeader)
		if tokenString == "" {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString != "" {
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return jwtSecret, nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					ctx := context.WithValue(r.Context(), UserIDKey, claims["user_id"])
					ctx = context.WithValue(ctx, RoleKey, claims["role"])
					r = r.WithContext(ctx)
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

func RequireRole(requiredRole string, next http.Handler) http.Handler {
	return RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := GetRoleFromContext(r.Context())
		if !ok || role != requiredRole {
			recordUnauthorized(r, "role_mismatch", role)
			http.Error(w, "Forbidden: คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	}))
}

func RequireNotAdmin(next http.Handler) http.Handler {
	return RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := GetRoleFromContext(r.Context())
		if ok && role == "admin" {
			http.Error(w, "Forbidden: Admin ไม่สามารถทำการดำเนินการนี้ได้", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	}))
}

// RequireAdminReadOnly allows only safe HTTP methods (GET, HEAD, OPTIONS) for admin users.
// For other methods, it returns 403 Forbidden. Non-admin users are unaffected.
func RequireAdminReadOnly(next http.Handler) http.Handler {
	return RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := GetRoleFromContext(r.Context())
		if ok && role == "admin" {
			method := r.Method
			if method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(dto.ErrorResponse{Status: http.StatusForbidden, Error: "", Message: "Forbidden: Admin has read‑only access for this endpoint"})
				return
			}
		}
		next.ServeHTTP(w, r)
	}))
}

func GetUserIDFromContext(ctx context.Context) (uint, bool) {
	if ctx == nil {
		return 0, false
	}

	switch v := ctx.Value(UserIDKey).(type) {
	case uint:
		return v, true
	case uint64:
		return uint(v), true
	case int:
		return uint(v), true
	case int64:
		return uint(v), true
	case float64:
		return uint(v), true
	case float32:
		return uint(v), true
	default:
		return 0, false
	}
}

func GetRoleFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}

	role, ok := ctx.Value(RoleKey).(string)
	return role, ok
}

func extractBearerToken(header string) string {
	parts := strings.Fields(header)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return strings.TrimSpace(header)
}