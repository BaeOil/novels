package middleware

import (
	"fmt"
	"net/http"
	"time"
)

// LoggingMiddleware logs HTTP requests with method, path, and duration
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func (lrw *loggingResponseWriter) Flush() {
	if flusher, ok := lrw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		lrw := &loggingResponseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(lrw, r)

		duration := time.Since(start)
		statusEmoji := "✅"
		if lrw.statusCode >= 400 {
			statusEmoji = "❌"
		}

		fmt.Printf("%s [%s] %s %s - Status: %d - Duration: %v\n",
			statusEmoji,
			r.Method,
			r.RequestURI,
			r.RemoteAddr,
			lrw.statusCode,
			duration,
		)
	})
}

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:5173"
		}

		allowedOrigin := origin
		if origin != "http://localhost:5173" && origin != "http://127.0.0.1:5173" {
			allowedOrigin = "http://localhost:5173"
		}

		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WrapHandlerWithLogging wraps a single handler with logging
func WrapHandlerWithLogging(handler http.HandlerFunc) http.HandlerFunc {
	return RequestLogger(handler).ServeHTTP
}
