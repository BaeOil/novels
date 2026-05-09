-- 1. สร้างตารางหมวดหมู่ (หมวดหมู่ต้องเกิดก่อนเพื่อน)
-- ==========================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- ==========================================
-- 2. สร้างตาราง User & Identity
-- ==========================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'reader', -- reader / writer / admin
    pic_profile VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE writers (
    writer_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    name_lastname VARCHAR(255),
    pen_name VARCHAR(255) NOT NULL,
    bio TEXT,
    email_writer VARCHAR(255),
    contact_info JSONB
);

-- สร้างตารางกลางสำหรับ Writer M:N Category (แก้ปัญหา Array)
CREATE TABLE writer_categories (
    writer_id INTEGER REFERENCES writers(writer_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE,
    PRIMARY KEY (writer_id, category_id)
);

-- ==========================================
-- 3. สร้างตาราง Novel Core
-- ==========================================
CREATE TABLE novels (
    novel_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    captions TEXT,
    introduction TEXT,
    cover_image VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    
    -- ✅ แก้ตรงนี้: ชี้ไปที่ตาราง writers แทน users
    author_id INTEGER REFERENCES writers(writer_id) ON DELETE CASCADE, 
    
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางกลางสำหรับ Novel M:N Category (แก้ปัญหา Array)
CREATE TABLE novel_categories (
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE,
    PRIMARY KEY (novel_id, category_id)
);

CREATE TABLE chapters (
    chapter_id SERIAL PRIMARY KEY,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    episode INTEGER NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (novel_id, episode) -- ป้องกันเลขตอนซ้ำกันในนิยายเรื่องเดียว
);

CREATE TABLE scenes (
    scene_id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'normal', -- start / normal / ending
    ending_title VARCHAR(255),
    ending_type VARCHAR(50), -- good / bad / true / secret
    ending_description TEXT
);

CREATE TABLE choices (
    choice_id SERIAL PRIMARY KEY,
    from_scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE CASCADE,
    to_scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL
);

-- ==========================================
-- 4. สร้างตาราง Social & Engagement
-- ==========================================
CREATE TABLE bookshelves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, novel_id)
);

CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, novel_id)
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id)
);

-- ==========================================
-- 5. สร้างตาราง Reading System
-- ==========================================
CREATE TABLE reading_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    current_scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE CASCADE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_choice_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    choice_id INTEGER REFERENCES choices(choice_id) ON DELETE CASCADE,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_scene_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE CASCADE,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, scene_id)
);

CREATE TABLE user_endings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(scene_id) ON DELETE CASCADE,
    reached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, scene_id)
);

-- ==========================================
-- 6. สร้างตาราง System (Future)
-- ==========================================
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    novel_id INTEGER REFERENCES novels(novel_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending / reviewed / resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50), -- NEW_CHAPTER, NEW_SCENE, NEW_NOVEL, FOLLOW, COMMENT
    reference_id INTEGER,
    reference_type VARCHAR(50), -- novel / chapter / scene / comment / user
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================

INSERT INTO categories (name) VALUES
('แฟนตาซี'),
('โรแมนติก'),
('สืบสวน'),
('สยองขวัญ'),
('ไซไฟ'),
('คอมเมดี้'),
('ดราม่า'),
('ผจญภัย');

INSERT INTO users (username, email, password_hash, role, pic_profile) VALUES
('admin_master', 'admin@novelverse.com', 'hashed_admin', 'admin', 'http://localhost:9000/novels-images/admin.jpg'),
('jane_writer', 'jane@novelverse.com', 'hashed_jane', 'writer', 'http://localhost:9000/novels-images/jane.jpg'),
('dark_john', 'john@novelverse.com', 'hashed_john', 'writer', 'http://localhost:9000/novels-images/john.jpg'),
('alice_reader', 'alice@novelverse.com', 'hashed_alice', 'reader', 'http://localhost:9000/novels-images/alice.jpg'),
('mike_reader', 'mike@novelverse.com', 'hashed_mike', 'reader', NULL);


-- ==========================================
-- LEVEL 2: ตารางที่ต้องอ้างอิง User
-- ==========================================

INSERT INTO writers (writer_id, user_id, name_lastname, pen_name, bio, email_writer, contact_info) VALUES
(1, 2, 'Jane Doe', 'JaneTheAuthor', '<p>นักเขียนสายแฟนตาซี ✨</p>', 'contact_jane@novelverse.com', '{"twitter":"@janetheauthor"}'),
(2, 3, 'John Smith', 'DarkMaster', '<p>นักเขียนสายสยอง 👁️</p>', 'contact_john@novelverse.com', '{"twitter":"@darkmaster"}');

INSERT INTO follows (follower_id, following_id) VALUES
(4,2),
(5,2),
(4,3);


-- ==========================================
-- LEVEL 3: ตารางที่ต้องอ้างอิง Writer & Category
-- ==========================================

INSERT INTO writer_categories (writer_id, category_id) VALUES
(1,1),
(1,2),
(1,8),
(2,3),
(2,4);

-- รวม Novels ทั้งหมดไว้ที่เดียวกัน (ID 1-4 จะเรียงกันพอดี)
INSERT INTO novels (title, captions, introduction, cover_image, status, author_id, views) VALUES
('แสงสุดท้ายแห่งเอลฟ์', 'เมื่อเอลฟ์ตัวสุดท้ายต้องกอบกู้โลก', '<p>โลกที่เวทมนตร์ใกล้ดับสูญ...</p>', 'http://localhost:9000/novels-images/elf_cover.jpg', 'published', 1, 2500),
('คฤหาสน์ซ่อนเงา', 'อย่าเปิดประตูบานนั้น', '<p>คฤหาสน์ลึกลับบนเนินเขา</p>', 'http://localhost:9000/novels-images/house_cover.jpg', 'published', 2, 1800),
('รักวุ่นวายยัยแฮกเกอร์', 'เจาะระบบหัวใจนายเย็นชา', '<p>ความรักของแฮกเกอร์สาว</p>', 'http://localhost:9000/novels-images/hacker_cover.jpg', 'draft', 1, 300),
('สงครามจักรกลแห่งอนาคต', 'ไซไฟ แอคชัน และดราม่า', '<p>โลกอนาคตที่ AI ปกครองมนุษย์</p>', 'http://localhost:9000/novels-images/future-war.jpg', 'published', 2, 4200);

-- รวม Novel Categories
INSERT INTO novel_categories (novel_id, category_id) VALUES
(1,1), (1,8), 
(2,3), (2,4), 
(3,2), (3,6),
(4,5), (4,1), (4,6);


-- ==========================================
-- LEVEL 4: ตารางที่ต้องอ้างอิง Novels (ตอนและอื่นๆ)
-- ==========================================

INSERT INTO chapters (novel_id, episode, title, status) VALUES
(1,1,'จุดเริ่มต้น','published'),
(1,2,'ป่าต้องห้าม','published'),
(1,3,'วิหารโบราณ','published'),
(2,1,'จดหมายสีเลือด','published'),
(2,2,'เสียงกระซิบ','published'),
(3,1,'บั๊กแรกของหัวใจ','draft');

INSERT INTO bookshelves (user_id, novel_id) VALUES
(4,1), (4,2), (5,1), (4,4), (5,4);

INSERT INTO likes (user_id, novel_id) VALUES
(4,1), (5,1), (4,2), (4,4), (5,4);

INSERT INTO reports (user_id, novel_id, reason, status) VALUES
(5, 2, 'หน้าปกน่ากลัวเกินไป', 'pending');

INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read) VALUES
(4, 'NEW_CHAPTER', 2, 'chapter', 'นิยายอัปเดตตอนใหม่แล้ว', false),
(2, 'COMMENT', 1, 'comment', 'มีคนคอมเมนต์นิยายของคุณ', true);


-- ==========================================
-- LEVEL 5: ตาราง Scenes (ต้องมี Chapter ก่อน)
-- รวม Scenes ทั้งหมดเข้าด้วยกัน (ID 1-10)
-- ==========================================

INSERT INTO scenes (chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description) VALUES
(1, 1, 'ลืมตาตื่น', '<h2>บทเริ่มต้น</h2><p>คุณตื่นกลางป่า...</p>', 'start', NULL, NULL, NULL),
(1, 1, 'ลำธารแห่งแสง', '<p>คุณพบลำธารศักดิ์สิทธิ์</p><img src="http://localhost:9000/novels-images/river.jpg" />', 'normal', NULL, NULL, NULL),
(1, 1, 'รอยเท้าปีศาจ', '<p>กลิ่นประหลาดโชยมา...</p>', 'normal', NULL, NULL, NULL),
(2, 1, 'ดาบโบราณ', '<p>คุณค้นพบดาบในตำนาน</p>', 'normal', NULL, NULL, NULL),
(2, 1, 'หมีกลายพันธุ์', '<p>หมียักษ์พุ่งเข้าใส่!</p>', 'ending', 'จุดจบแห่งป่า', 'bad', 'คุณถูกฆ่าโดยสัตว์ประหลาด'),
(3, 1, 'ผู้ถูกเลือก', '<p>คุณปลุกพลังเอลฟ์สำเร็จ</p>', 'ending', 'ผู้ถูกเลือก', 'true', 'คุณเริ่มต้นการกอบกู้โลก'),
(2, 1, 'ทางเข้าสู่ป่าต้องห้าม', '<p>หลังจากได้ดาบในตำนาน คุณเดินทางมาถึงป่าต้องห้าม ต้นไม้รอบตัวสูงผิดธรรมชาติ และมีหมอกสีดำปกคลุมทั่วพื้นที่</p><p><strong>เบื้องหน้าคือประตูหินโบราณ</strong></p>', 'normal', NULL, NULL, NULL),
(2, 1, 'เสียงเรียกจากเงามืด', '<p>คุณได้ยินเสียงกระซิบเรียกชื่อของคุณจากภายในป่า</p><p><em>"จงเข้ามา..."</em></p>', 'normal', NULL, NULL, NULL),
(2, 1, 'ห้องสมุดโบราณ', '<h2>ห้องสมุดต้องห้าม</h2><p>คุณเดินเข้ามาในห้องสมุดเก่าแก่</p><p><img src="http://localhost:9000/novels-images/library.jpg" alt="library" /></p><p>บนกำแพงมีภาพเคลื่อนไหวเวทมนตร์ปรากฏขึ้น</p><iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="magic video" frameborder="0" allowfullscreen></iframe><p><strong>คุณจะทำอย่างไรต่อ?</strong></p>', 'normal', NULL, NULL, NULL),
(2, 1, 'ห้องลับใต้ต้นไม้โลก', '<p>คุณค้นพบห้องลับที่ไม่มีใครเคยพบมาก่อน...</p>', 'ending', 'ผู้พิทักษ์ต้นไม้โลก', 'secret', 'คุณค้นพบความจริงของโลก และกลายเป็นผู้พิทักษ์คนใหม่');


-- ==========================================
-- LEVEL 6: ตารางที่ต้องอ้างอิง Scenes 
-- (Choices, Comments, History, Endings)
-- ==========================================

-- รวม Choices ทั้งหมด
INSERT INTO choices (from_scene_id, to_scene_id, label) VALUES
(1,2,'เดินไปทางลำธาร'),
(1,3,'เดินตามรอยเท้า'),
(2,4,'หยิบดาบโบราณ'),
(3,5,'สำรวจเสียง'),
(4,6,'ปลดปล่อยพลังเอลฟ์'),
(4,7,'ถือดาบแล้วเดินทางต่อเข้าสู่ป่าต้องห้าม'),
(7,8,'เปิดประตูหินโบราณ');

-- รวม Comments ทั้งหมด
INSERT INTO comments (user_id, novel_id, scene_id, content) VALUES
(4, 1, 1, 'เปิดเรื่องได้น่าสนใจมากค่ะ'),
(5, 1, 5, 'จบไวเกิน 😭'),
(4, 2, NULL, 'ชอบบรรยากาศมาก'),
(4, 4, NULL, 'โลกไซไฟเรื่องนี้สนุกมาก!'),
(5, 4, NULL, 'อยากให้ทำเป็นเกมเลย');

INSERT INTO reading_progress (user_id, novel_id, current_scene_id) VALUES
(4,1,6),
(5,1,5);

INSERT INTO user_scene_history (user_id, scene_id) VALUES
(4,1), (4,2), (4,4), (4,6),
(5,1), (5,3), (5,5);

INSERT INTO user_endings (user_id, scene_id) VALUES
(4,6),
(5,5);


-- ==========================================
-- LEVEL 7: ตารางที่ต้องอ้างอิง Choices 
-- (ต้องมี Choices ก่อนถึงจะผูกประวัติได้)
-- ==========================================

INSERT INTO user_choice_history (user_id, choice_id) VALUES
(4,1), (4,3), (4,5),
(5,2), (5,4);