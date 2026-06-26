package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"novel-be/internal/dto"
	"novel-be/internal/models"
	"novel-be/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	jwtSecret            = "my-super-secret-novel-key"
	refreshTokenSecret   = "my-super-secret-refresh-key"
	accessTokenDuration  = time.Hour * 24
	refreshTokenDuration = time.Hour * 24 * 7
)

type AuthService struct {
	repo repository.AuthRepository
}

func NewAuthService(repo repository.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Register จัดการการแฮชรหัสผ่านและสั่งบันทึกข้อมูลจริงลงฐานข้อมูล
func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest, avatarURL string) (*dto.AuthResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)

	if existing, err := s.repo.GetByUsername(ctx, req.Username); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, errors.New("username already in use")
	}

	if existing, err := s.repo.GetByEmail(ctx, req.Email); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, errors.New("email already in use")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		PicProfile:   avatarURL,
		Role:         "reader",
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	accessToken, err := s.createToken(user, accessTokenDuration, jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.createToken(user, refreshTokenDuration, refreshTokenSecret)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(user, accessToken, refreshToken), nil
}

// Login ตรวจสอบความถูกต้องของ Email / Password และออกบัตรผ่าน JWT Token
func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("กรุณากรอกอีเมลและรหัสผ่าน")
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	user, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ไม่พบบัญชีผู้ใช้งานนี้ในระบบ")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")
	}

	accessToken, err := s.createToken(user, accessTokenDuration, jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.createToken(user, refreshTokenDuration, refreshTokenSecret)
	if err != nil {
		return nil, err
	}

	res := s.buildAuthResponse(user, accessToken, refreshToken)
	return res, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, req dto.RefreshRequest) (*dto.AuthResponse, error) {
	if strings.TrimSpace(req.RefreshToken) == "" {
		return nil, errors.New("refresh token is required")
	}

	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid refresh token signing method")
		}
		return []byte(refreshTokenSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("refresh token is invalid or expired")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid refresh token claims")
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return nil, errors.New("invalid refresh token payload")
	}

	userID := uint(userIDFloat)
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	accessToken, err := s.createToken(user, accessTokenDuration, jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.createToken(user, refreshTokenDuration, refreshTokenSecret)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(user, accessToken, refreshToken), nil
}

func (s *AuthService) createToken(user *models.User, duration time.Duration, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(duration).Unix(),
	})
	return token.SignedString([]byte(secret))
}

func (s *AuthService) buildAuthResponse(user *models.User, accessToken, refreshToken string) *dto.AuthResponse {
	res := &dto.AuthResponse{
		Token:        accessToken,
		RefreshToken: refreshToken,
	}
	res.User.ID = user.ID
	res.User.Username = user.Username
	res.User.Email = user.Email
	res.User.PicProfile = user.PicProfile
	res.User.Role = user.Role
	return res
}

// GetUserByID ดึงข้อมูลผู้ใช้โดยใช้ ID ของเขา (สำหรับ /api/users endpoint)
func (s *AuthService) GetUserByID(ctx context.Context, userID uint) (*models.User, error) {
	if userID == 0 {
		return nil, errors.New("ไอดีผู้ใช้ไม่ถูกต้อง")
	}

	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ไม่พบบัญชีผู้ใช้นี้")
	}

	return user, nil
}
