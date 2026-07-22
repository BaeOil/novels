# SPEC.md - Interactive Fiction Platform (DAG)

**Version:** MVP 1.0  
**Project:** Final Year Project (Bachelor of Information Technology)

---

# 1. Project Overview & Goals

Interactive Fiction Platform คือเว็บแอปพลิเคชันสำหรับสร้างและอ่านนิยายแบบเลือกเส้นทาง (Interactive Novel)

ระบบเปิดโอกาสให้นักเขียนสามารถสร้างโครงสร้างเรื่องแบบแตกแขนง (Branching Narrative) และให้ผู้อ่านมีส่วนร่วมกับเรื่องราวผ่านการเลือกเส้นทางของตนเอง ซึ่งอาจนำไปสู่ตอนจบที่แตกต่างกัน

ระบบแบ่งผู้ใช้ออกเป็น 3 บทบาทหลัก ได้แก่

- Reader (ผู้อ่าน)
- Writer (นักเขียน)
- Admin (ผู้ดูแลระบบ)

---

# 2. Domain Terminology & Concepts

## Novel (นิยาย)

หน่วยหลักของเรื่องราว ประกอบด้วยหลายตอน (Chapter)

---

## Chapter (ตอน)

Chapter ใช้เป็น Group Container สำหรับจัดกลุ่ม Scene ใน Story Structure เท่านั้น และไม่มีการเชื่อม Edge ระหว่าง Chapter
- 1 ตอนสามารถมีได้หลายฉาก

---

## Scene (ฉาก)

หน่วยหลักของการเล่าเรื่อง

Scene ประกอบด้วย

- Title
- Content
- Image
- Choices
- Ending Settings

Scene จะแสดงผลเป็น **Node** ภายในโครงสร้าง DAG

ข้อกำหนด

- 1 ฉาก สังกัดได้เพียง 1 ตอนเท่านั้น

---

## Choice (ตัวเลือก)

ตัวเลือกที่ผู้อ่านใช้ตัดสินใจเมื่ออ่านจบฉาก

Choice จะแสดงผลเป็น **Edge** เชื่อมระหว่าง

```
from_scene → to_scene
```

Choice เป็นตัวกำหนดเส้นทางการอ่าน และส่งผลต่อตอนจบของเรื่อง

---

## Ending (ฉากจบ)

Scene สามารถกำหนดให้เป็นฉากจบได้

รองรับทั้งหมด 4 ประเภท

- Good Ending
- Bad Ending
- True Ending
- Secret Ending

ข้อมูลที่จัดเก็บ

- Ending Title
- Ending Type
- Ending Description

---

## Story Map (แผนผังการอ่าน)

สำหรับ **Reader**

ใช้แสดงเส้นทางการอ่านที่ปลดล็อกแล้ว

สามารถ

- ดูเส้นทางที่เคยอ่าน
- ย้อนกลับไปอ่านฉากเดิม
- เปลี่ยนสายการอ่านจากฉากที่ปลดล็อกแล้ว
- เชื่อมโยงกับหน้าอ่านนิยายแบบ Real-time

---

## Story Structure (โครงสร้างเนื้อเรื่อง)

สำหรับ **Writer**

ใช้แสดงภาพรวมของโครงสร้างนิยายแบบ DAG

แสดง

- Chapter
- Scene (Node)
- Choice (Edge)

รองรับ

- เพิ่มฉาก
- ลบฉาก
- แก้ไขฉาก
- ตรวจสอบความสัมพันธ์ของฉาก
- วางแผนโครงสร้างเรื่อง

---

# 3. Domain Model & Hierarchy

```text
Novel
│
└── Chapter
      │
      └── Scene
            │
            ├── Choice
            │
            └── Ending
```

---

# 4. Story Rules

โครงสร้างของนิยายต้องเป็น Directed Acyclic Graph (DAG)

ข้อกำหนด

- Scene ต้องอยู่ภายใต้ Chapter เพียง 1 ตอน
- Chapter ต้องอยู่ภายใต้ Novel เพียง 1 เรื่อง
- Choice สามารถเชื่อมได้เฉพาะระหว่าง Scene เท่านั้น
- ห้ามเกิด Loop (Circular Dependency)
- ทุก Choice ต้องมี Scene ปลายทางที่ถูกต้อง
- ระบบต้องตรวจสอบ DAG ก่อนบันทึกทุกครั้ง

## Start Scene

นิยายทุกเรื่องต้องมีฉากเริ่มต้น (Start Scene) เพียง 1 ฉาก

กฎ

- ระบบกำหนด Scene แรกของ Chapter แรก เป็น Start Scene โดยอัตโนมัติ
- หากลบ Start Scene ระบบต้องบังคับเลือกฉากใหม่ก่อน Publish
- Reader ทุกคนจะเริ่มอ่านจาก Start Scene เสมอ

## Publish Validation

ก่อนเผยแพร่นิยาย ระบบต้องตรวจสอบว่า

- มี Start Scene
- ไม่มี Loop
- Choice ทุกตัวเชื่อมไปยัง Scene ที่มีอยู่จริง
- ไม่มี Scene ที่ถูกลบแต่ยังมี Choice ชี้อยู่

หากไม่ผ่าน ระบบต้องไม่อนุญาตให้เผยแพร่

---

# 5. Reading Rules

## Reading Progress

ระบบต้องบันทึก

- Current Scene
- ไม่ใช่ Scene ล่าสุดที่เคยเปิด

ข้อมูลจะถูกเก็บใน

```
reading_progress.current_scene_id
```

---

## Reading History

หน้าประวัติการอ่าน

มีหน้าที่เพียงแสดงข้อมูล

ต้องไม่

- Update Progress
- บันทึก Scene ใหม่
- บันทึก Choice ใหม่
- บันทึก Ending ใหม่

---

## แผนผังการอ่าน

แผนผังการใช้แสดงเส้นทางที่ผู้อ่านปลดล็อกแล้ว

การเปิดแผนผังการอ่านเพียงอย่างเดียว

- ต้องไม่เปลี่ยน Reading Progress

เมื่อ Reader กดเลือก "ย้อนกลับไปอ่าน"

ระบบจึงจะ

- เปลี่ยน Current Scene
- บันทึก Reading Progress ใหม่
- อ่านต่อจาก Scene ที่เลือก

---

## Ending

เมื่อ Reader เดินทางถึง Scene ที่เป็น Ending

ระบบต้อง

- บันทึก Ending ที่ปลดล็อก
- บันทึก Reading Progress
- บันทึก Scene History

หากปลดล็อก Ending เดิมซ้ำ

- ไม่ต้องสร้างข้อมูลซ้ำ

---

## Preview Mode

Preview Mode สำหรับ Writer

มีไว้ทดลองอ่านเท่านั้น

ต้องไม่กระทบข้อมูลจริงของ Reader

ห้าม

- บันทึก Progress
- บันทึก History
- บันทึก Choice
- บันทึก Ending

---

# 6. User Roles

## Guest

สามารถ

- ดูรายการนิยาย
- อ่านนิยาย
- ดูข้อมูลนักเขียน
- เลือกทางเลือกได้

แต่ระบบจะไม่บันทึก

- Reading Progress
- Reading History
- Ending Collection
- Choice History

ไม่สามารถ

- แสดงความคิดเห็น
- Bookmark
- ติดตามนักเขียน
- บันทึก Progress

---

## Reader

สามารถ

- อ่านนิยาย
- เลือกเส้นทาง
- อ่านต่อ
- ดูประวัติการอ่าน
- ดู แผนผังการอ่าน
- ดู Ending Collection
- Bookmark
- Like
- Comment
- Follow นักเขียน

---

## Writer

สามารถ

- สร้างนิยาย
- จัดการตอน
- จัดการฉาก
- เขียนเนื้อหา
- เพิ่มรูปภาพ
- เพิ่ม Choice
- ตั้งค่า Ending
- ทดลองอ่าน
- ดู Story Structure

---

## Admin

สามารถ

- อนุมัตินักเขียน
- จัดการหมวดหมู่
- จัดการ Report
- จัดการ Banner
- ตรวจสอบข้อมูลระบบ

---

# 7. Business Rules

- นิยายสามารถมีหลายตอน
- ตอนสามารถมีหลายฉาก
- ฉากต้องอยู่ได้เพียงตอนเดียว
- Choice เชื่อมได้เฉพาะ Scene → Scene
- ระบบต้องรักษาโครงสร้าง DAG ตลอดเวลา
- Ending เป็นคุณสมบัติของ Scene
- Reading Progress มีได้เพียง 1 Current Scene ต่อ Reader ต่อ Novel

---

# 8. Non-Functional Requirements

## Performance

- API Response ควรต่ำกว่า 500 ms (Local)

## Security

- JWT Authentication
- Password Hash
- SQL Injection Protection

## Usability

- Beginner-friendly
- Minimal UI
- Responsive Design

## Storage

- PostgreSQL
- MinIO


