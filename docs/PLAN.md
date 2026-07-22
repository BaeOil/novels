# PLAN.md - Interactive Fiction Platform

อ่าน AGENTS.md และ SPEC.md ก่อนเริ่มพัฒนาเสมอ

---

# 1. Development Architecture

## Backend

แบ่งโครงสร้างออกเป็น 5 ชั้น

```
HTTP Request
      │
Routes
      │
Handlers
      │
Services
      │
Repositories
      │
PostgreSQL
```

หน้าที่ของแต่ละชั้น

### Routes

- ลงทะเบียน API
- จัดการ Middleware
- ไม่เขียน Business Logic

### Handlers

รับผิดชอบเฉพาะ

- รับ Request
- Validate Request เบื้องต้น
- เรียก Service
- ส่ง HTTP Response

Handler ต้องไม่ติดต่อ Database โดยตรง

---

### Services

รับผิดชอบ Business Logic ทั้งหมด เช่น

- ตรวจสอบสิทธิ์ผู้ใช้
- ตรวจสอบกฎของระบบ
- ตรวจสอบ DAG
- การบันทึก Reading Progress
- การปลดล็อก Ending
- การจัดการ Story Structure

Service ไม่ควรรู้รายละเอียด SQL

---

### Repositories

รับผิดชอบ

- Query PostgreSQL
- Insert
- Update
- Delete
- Transaction

Repository ไม่มี Business Logic

---

### Database

ใช้ PostgreSQL

ข้อมูลทั้งหมดต้องผ่าน Repository เท่านั้น

---

# 2. Frontend Architecture

แบ่งออกเป็น

```
Pages
   │
Components
   │
API Layer
   │
Backend API
```

---

## Pages

รับผิดชอบ

- Layout
- Route
- State หลักของหน้า

Pages ไม่ควรมี Business Logic จำนวนมาก

---

## Components

ใช้สำหรับ

- UI
- Reusable Components
- Form
- Modal
- Cards
- Graph Components

Component ไม่ควรเรียก fetch โดยตรง

---

## API Layer

รวมการเรียก API ทั้งหมดไว้ใน Layer เดียว

หน้าที่

- Authentication
- Novel API
- Chapter API
- Scene API
- Choice API
- Reading API
- Writer API
- Admin API

Frontend ทุกหน้าต้องเรียกผ่าน API Layer เท่านั้น

---

# 3. Error Handling

Backend ส่ง Error ในรูปแบบเดียวกันทั้งระบบ

```
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

แต่ละ Endpoint ต้องส่ง HTTP Status ให้สอดคล้องกับข้อผิดพลาด

เช่น

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 500 Internal Server Error

Frontend ต้องแสดงข้อความ Error ให้ผู้ใช้เข้าใจง่าย

---

# 4. Validation Rules

Validation ต้องทำใน Service Layer

ตัวอย่าง

- ตรวจสอบ DAG
- ตรวจสอบสิทธิ์ Writer
- ตรวจสอบข้อมูลซ้ำ
- ตรวจสอบ Choice ปลายทาง
- ตรวจสอบ Ending
- ตรวจสอบ Reading Progress

ห้ามพึ่ง Validation จาก Frontend เพียงอย่างเดียว

---

# 5. State Management

Frontend ใช้ React Hooks

เช่น

- useState
- useEffect
- useMemo
- useCallback

ข้อมูลที่ใช้ร่วมกันสามารถใช้ Context เมื่อจำเป็น

หลีกเลี่ยงการเก็บ State ซ้ำหลายตำแหน่ง

---

# 6. Testing Strategy

Backend

ใช้

- go test
- httptest

ทดสอบ

- Handler
- Service
- Repository

ครอบคลุมกรณี

- Success
- Validation Error
- Permission Error
- Edge Cases

---

Frontend

ทดสอบ

- การทำงานของหน้าหลัก
- การเชื่อม API
- การแสดงผลข้อมูล
- การจัดการ Error
- การตอบสนองของ UI

---

# 7. Development Principles

ทุกฟีเจอร์ใหม่ต้อง

- สอดคล้องกับ AGENTS.md
- สอดคล้องกับ SPEC.md
- ไม่ทำลาย Business Rules เดิม
- ไม่ทำให้โครงสร้าง DAG ผิดเงื่อนไข
- ไม่กระทบ Reading Progress ของผู้ใช้

หากต้องแก้ไข Database Schema หรือ Business Rule ให้ปรับ SPEC ก่อนเสมอ