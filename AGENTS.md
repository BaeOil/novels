# Agent Guidelines (agent.md)

## What this project is
Interactive Fiction Platform (Final Year Project - IT)
เว็บแอปพลิเคชันอ่านและเขียนนิยายทางเลือก นำเสนอโครงสร้างเนื้อเรื่องแบบ DAG (Directed Acyclic Graph)
สถานะปัจจุบัน: MVP ทำงานได้แล้วแต่อยู่ในช่วงเก็บตกความเสถียร แก้ไข Bug และพัฒนาฟีเจอร์ส่วนเพิ่ม (Profile, Settings, Admin Tools, Notifications)

---

## Tech Stack & Architecture
- **Backend:** Go 1.22+ Standard Library (`net/http`, `http.ServeMux`) *[ห้ามใช้ Web Framework เช่น Gin/Fiber]*
- **Database:** PostgreSQL (`database/sql` + `github.com/lib/pq`)
- **Storage:** MinIO (สำหรับเก็บรูปภาพและไฟล์สื่อ)
- **Auth & Config:** JWT (`golang-jwt/jwt/v5`) + Viper (`spf13/viper`)
- **Frontend:** React + Vite + JavaScript (JSX) + React Router + React Flow (`@xyflow/react`) + Tailwind CSS / Custom CSS
- **Deployment Stack:** Docker Compose (Local/Infra Stack), Railway (Backend Server), Vercel (Frontend)

---

## Domain & UX Philosophy (กฎการออกแบบ)
- **Platform Type:** นี่คือ **Interactive Novel Platform** ไม่ใช่เกม!
- **Terminology:** ใช้คำว่า *นิยาย (Novel), ตอน (Chapter), ฉาก (Scene), ตัวเลือก (Choice), ตอนจบ (Ending), ผู้อ่าน (Reader), นักเขียน (Writer)* **[ห้ามใช้คำศัพท์เกม เช่น Level, Exp, Inventory, Combat]**
- **UI Principles:**
  - Minimalist, โทนสีหลัก Soft Pink Theme, Clean, สบายตา
  - เน้นใช้งานง่ายสำหรับนักเขียนมือใหม่ (Beginner-friendly)
  - **Prefer:** Cards, Rounded corners, Large spacing, Simple hierarchy
  - **Avoid:** Complex dashboards, Dense tables, Tiny buttons, Hidden actions

---

## Story & Graph Rules (กฎโครงสร้างเนื้อเรื่อง)
1. **DAG Constraint:** โครงสร้างฉากและตัวเลือกต้องเป็น Directed Acyclic Graph (DAG)  เท่านั้น **ห้ามเกิด Loop (Circular Dependency) เด็ดขาด** และทุกๆ ทางเลือกใหม่จะต้องได้รับการตรวจสอบความถูกต้องก่อนบันทึก
2. **Hierarchy & Relationship:** `Novel` → `Chapter` → `Scene` → `Choice`
   - **Chapter (ตอน):** มีไว้จัดกลุ่มฉากเท่านั้น **ไม่มี** Text Editor ใน Chapter (1 ตอน สามารถมีได้หลายฉาก)
   - **Scene (ฉาก):** เป็น Node ใน Graph เก็บ Title, Content, Images, Choices, และ Ending Settings (**1 ฉาก สังกัดได้เพียง 1 ตอนเท่านั้น**)
   - **Choice (ตัวเลือก):** เป็น Edge เชื่อมระหว่าง `from_scene` ไปยัง `to_scene` (เชื่อมระดับ Scene ไม่ใช่ Chapter)
3. **Ending Types:**
   - ประเภทตอนจบ: `Good Ending`, `Bad Ending`, `True Ending`, `Secret Ending`
   - ข้อมูลตอนจบที่ต้องบันทึก: `ending_title`, `ending_type`, `ending_description`
4. **React Flow / Story Tree:**
   - Node Types ได้แก่: `Chapter`, `Scene`, `Ending`
   - **ห้ามพัง/แก้ Layout Logic เดิมของ Node** ให้ใช้วิธี Extension เพิ่มเติมเท่านั้น

---

## Reading, Preview & State Rules
- `reading_progress` ต้องเก็บ **Current Scene ID** (ฉากปัจจุบันที่อ่านถึง) ไม่ใช่ฉากล่าสุดที่เคยแวะไป
- ปุ่ม **"อ่านต่อ" (Continue Reading)** ต้องดึงจาก `reading_progress.current_scene_id` เสมอ
- **History Page:** แสดง Progress, Chapter, Scene, Choice ล่าสุด **ห้าม Update ค่า Progress เมื่อ Reader เข้ามาเปิดดู History**
- **Preview Mode:** โหมดทดลองอ่านของนักเขียน ต้องจำลองพฤติกรรมผู้อ่านโดย **ห้ามบันทึกหรือกระทบกับข้อมูล Production จริงใน DB**
- ข้อมูลความคืบหน้าสอดคล้องกันผ่าน 4 โต๊ะหลัก: `reading_progress`, `user_scene_history`, `user_choice_history`, `user_endings`

---

## Project Layout

### Backend (`novel-BE/`)
- `cmd/main.go` - Entry point
- `config/` - Viper configuration
- `internal/db/` - DB Connection Setup
- `internal/dto/` - Request/Response DTOs
- `internal/handlers/` - HTTP Handlers
- `internal/middleware/` - JWT Auth & CORS Middleware
- `internal/models/` - Domain Models
- `internal/repository/` - SQL Queries & MinIO Integration
- `internal/routes/` - Route Registration (`http.ServeMux`)
- `internal/service/` - Business Logic (DAG Validation, Progress, Auth)

### Frontend (`novel-FE/`)
- `src/components/` - Reusable UI Components
- `src/data/` - Static & Mock Data (เช่น `mockwriterdata.js`)
- `src/pages/` - Role-based Pages (`Admin/`, `Auth/`, `Reader/`, `Writer/`)
- `src/style/` - App.css, index.css
- `src/utils/` - Helper functions (`cropImage.js`, `novelStatus.js`, `toast.js`)
- `src/App.jsx` & `src/main.jsx`

### Documentation
- `docs/` - `SPEC.md`, `PLAN.md`, `TASKS.md`, `openapi.yaml` ← อ่านก่อนเริ่มงานทุกครั้ง

---

## Rules (must follow)
1. **Plan ก่อน code เสมอ:** ห้ามเขียนโค้ดก่อนเสนอแผนสั้นๆ ให้ Human เห็นและอนุมัติ
2. **ทำทีละ 1 task จาก `docs/TASKS.md` เท่านั้น:** ห้ามเขียนโค้ดเกินขอบเขต task
3. **เมื่อแก้ไขหรือ refactor โค้ด MVP เดิม:** ต้องตรวจสอบ Test และเขียน Test คุม Edge Cases เสมอ ห้ามลบ/แก้ test ของเดิมเพื่อให้ผ่านโดยไร้เหตุผล
4. **Business rule บังคับใช้ทั้งระดับ Service และ Database Constraint:** (เช่น การป้องกัน Loop ใน DAG)
5. **ทุก Endpoint หรือ API Payload ต้องตรงกับ `docs/openapi.yaml`:** หากต้องการเปลี่ยน/เพิ่ม ให้แก้ Contract ก่อนแล้วถาม Human
6. **Error response ฝั่ง Backend ใช้รูปแบบเดียวทั้งระบบ:** `{"error": {"code": "...", "message": "..."}}`
7. **Authentication ใช้ JWT ผ่าน Middleware ใน `internal/middleware/`:** ห้ามเขียน Auth Check ซ้ำซ้อนใน Handlers
8. **มีคำถามหรือความกำกวม ให้ถาม Human ก่อน:** ห้ามเดาเอาเอง
9. **จำกัดการเปลี่ยนแปลงให้เกิดขึ้นน้อยที่สุด ห้ามเขียนโค้ดใหม่ทั้งหมดทั้งไฟล์ยกเว้นจะได้รับคำสั่งอย่างชัดเจนเน้นการส่งโค้ดแก้ไขเป็นจุดเล็กๆ เฉพาะเรื่อง

---

## Coding & Safety Rules

### Database & Safety Rules
- **ห้ามแก้ไข Database Schema** เว้นแต่จะมีคำสั่งชัดเจน ให้พยายามปรับ Logic ฝั่ง Backend ก่อนเสมอ
- หลีกเลี่ยงการ Refactor โค้ดที่ไม่จำเป็น หากไม่แน่ใจให้ถามก่อนปรับเปลี่ยน Architecture

### Backend Rules
- ใช้ RESTful API รูปแบบมาตรฐาน คืนค่า JSON เสมอ
- ห้ามเขียน SQL ซ้ำซ้อน และต้องใช้ DB Transaction เมื่อมีการอัปเดตหลาย Table พร้อมกัน

### Frontend Rules
- ใช้ Functional Components และ React Hooks (`useState`, `useEffect`, `useMemo`)
- แยก Component ไม่ให้ขนาดใหญ่เกินไป
- ใช้ CSS Classes (Tailwind/CSS Modules) **หลีกเลี่ยง Inline Styles**

### Dependency Rules

- ห้ามติดตั้ง package ใหม่ หาก package นั้นมีอยู่ใน package.json แล้ว
- ก่อนติดตั้ง dependency ใหม่ ต้องตรวจสอบ package.json และ package-lock.json ก่อน
- หากจำเป็นต้องเพิ่ม dependency ใหม่ ต้องอธิบายเหตุผลก่อนทุกครั้ง

---

## Commands
- Start Infra Stack:   docker compose build && docker compose up -d
- Run Backend Local:    cd novel-BE && go run ./cmd/main.go   (port 8080)
- Backend test:         cd novel-BE && go test ./...
- Backend lint:         cd novel-BE && golangci-lint run && gosec ./...
- Run Frontend Local:   cd novel-FE && npm run dev           (port 5173)
- Frontend check:       cd novel-FE && npm run lint && npm run build