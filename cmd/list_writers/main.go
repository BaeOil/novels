package main

import (
    "database/sql"
    "fmt"
    "log"
    _ "github.com/lib/pq"
    "os"
)

func main() {
    connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        os.Getenv("POSTGRES_HOST"), os.Getenv("POSTGRES_PORT"), os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD"), os.Getenv("POSTGRES_DBNAME"))
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatalf("db open error: %v", err)
    }
    defer db.Close()
    rows, err := db.Query("SELECT writer_id, pen_name, status FROM writers")
    if err != nil {
        log.Fatalf("query error: %v", err)
    }
    defer rows.Close()
    fmt.Println("Writer entries:")
    for rows.Next() {
        var id int
        var pen, status string
        if err := rows.Scan(&id, &pen, &status); err != nil {
            log.Fatalf("scan error: %v", err)
        }
        fmt.Printf("ID=%d, PenName=%s, Status=%s\n", id, pen, status)
    }
    if err := rows.Err(); err != nil {
        log.Fatalf("rows error: %v", err)
    }
}
