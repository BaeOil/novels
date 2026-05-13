DROP TABLE IF EXISTS 
    notifications, 
    reports, 
    user_endings, 
    user_scene_history, 
    user_choice_history, 
    reading_progress, 
    follows, 
    comments, 
    likes, 
    bookshelves, 
    choices, 
    scenes, 
    chapters, 
    novel_categories, 
    novels, 
    writer_categories, 
    writers, 
    users, 
    categories 
CASCADE;

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
    contact_info JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
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

-- ==========================================
-- LEVEL 2: ตารางที่ต้องอ้างอิง User (Writers)
-- ==========================================

INSERT INTO writers (
    writer_id, 
    user_id, 
    name_lastname, 
    pen_name, 
    bio, 
    email_writer, 
    contact_info, 
    status, 
    applied_at, 
    approved_at
) VALUES
(
    1, 
    2, 
    'Jane Doe', 
    'JaneTheAuthor', 
    '<h2>เกี่ยวกับนักเขียน</h2><p>นักเขียนสายแฟนตาซีผู้หลงรักในการสร้างโลกใหม่ ✨</p>', 
    'contact_jane@novelverse.com', 
    '{"twitter": "@janetheauthor", "facebook": "Jane.Fiction"}', 
    'approved', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
),
(
    2, 
    3, 
    'John Smith', 
    'DarkMaster', 
    '<h2>Dark Master Official</h2><p>นักเขียนสายสยองขวัญ สั่นประสาท 👁️</p>', 
    'contact_john@novelverse.com', 
    '{"twitter": "@darkmaster", "website": "darknovel.com"}', 
    'approved', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
);

-- รีเซ็ตค่า SERIAL ของ writer_id ให้เริ่มนับต่อจาก 2 (ป้องกัน Error เวลาเพิ่มคนใหม่)
SELECT setval('writers_writer_id_seq', (SELECT MAX(writer_id) FROM writers));

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

-- ลบข้อมูลเดิมออกก่อนเพื่อให้ ID ไม่ตีกัน (กรณีใช้ Script เดิม)
DELETE FROM scenes WHERE novel_id = 1;

INSERT INTO scenes (chapter_id, novel_id, title, content, type, ending_title, ending_type, ending_description) VALUES
(1, 1, 'ลืมตาตื่นในพงไพร', 
'<h2>บทนำ: แสงที่จางหาย</h2>
<p>ความเย็นเยียบของหยดน้ำค้างที่ตกลงบนแก้ม ปลุกให้สติที่หลุดลอยของกัลเดรลค่อยๆ กลับคืนมา เขารู้สึกได้ถึงกลิ่นอายของดินชื้นและใบไม้แห้ง กลิ่นที่เขาคุ้นเคยดี... <strong>ป่าแห่งเอลฟ์</strong></p>
<p>"เจ้าตื่นแล้วหรือ... ผู้สืบทอดคนสุดท้าย"</p>
<p>เสียงกระซิบแผ่วเบาดังมาจากทิศทางที่มองไม่เห็น กัลเดรลยันตัวขึ้นช้าๆ รอบกายของเขามีเพียงต้นไม้ขนาดยักษ์ที่ยืนต้นตายซาก กิ่งก้านไร้ใบเหยียดยาวราวกับมือที่โหยหาแสงสว่างที่ไม่มีวันมาถึง</p>
<p><em>เวทมนตร์แห่งพฤกษาหายไปหมดแล้ว...</em> เขาคิดด้วยความเจ็บปวดในใจ ทันใดนั้น แสงสีฟ้าอ่อนจางก็วาบขึ้นที่ปลายนิ้วของเขา มันคือพลังเฮือกสุดท้ายที่โลกทิ้งไว้ให้</p>
<p><strong>คุณจะทำอย่างไรต่อไป?</strong></p>', 
'start', NULL, NULL, NULL),

(1, 1, 'ลำธารแห่งแสง', 
'<p>คุณพบลำธารศักดิ์สิทธิ์ที่น้ำยังคงใสสะอาดราวกับคริสตัล ท่ามกลางป่าที่ตายซาก ลำธารนี้ดูเหมือนจะเป็นสิ่งเดียวที่ยังมีชีวิตอยู่</p>
<img src="http://localhost:9000/novels-images/river.jpg" style="width:100%; border-radius:10px;" />', 
'normal', NULL, NULL, NULL),

(1, 1, 'รอยเท้าปีศาจ', 
'<p>กลิ่นสาบสางประหลาดโชยมาตามลม มันเป็นกลิ่นที่ชวนให้คลื่นเหียน บนพื้นดินเลนคุณพบรอยเท้าขนาดใหญ่ที่มีกรงเล็บแหลมคมมุ่งหน้าไปทางทิศตะวันออก</p>', 
'normal', NULL, NULL, NULL),

(2, 1, 'ดาบโบราณ', 
'<p>ท่ามกลางซากปรักหักพัง คุณค้นพบดาบที่สลักลวดลายใบไม้โบราณ ตัวดาบส่องแสงสีเขียวจางๆ เมื่อคุณสัมผัสมัน</p>', 
'normal', NULL, NULL, NULL),

(2, 1, 'หมีกลายพันธุ์', 
'<p>ทันใดนั้น หมียักษ์ที่มีดวงตาสีแดงฉานและร่างกายบิดเบี้ยวด้วยพลังมืดพุ่งเข้าใส่คุณอย่างรวดเร็ว!</p>', 
'ending', 'จุดจบแห่งป่า', 'bad', 'คุณไม่สามารถหลบหนีได้พ้นและถูกปลิดชีพโดยอสูรที่บ้าคลั่ง'),

(3, 1, 'ผู้ถูกเลือก', 
'<p>แสงสว่างระเบิดออกจากร่างของคุณ พลังแห่งพฤกษาถูกปลุกให้ตื่นขึ้นอีกครั้ง ต้นไม้รอบข้างเริ่มแตกกิ่งก้านสาขาอย่างรวดเร็ว</p>', 
'ending', 'ผู้ถูกเลือก', 'true', 'คุณเริ่มต้นการเดินทางในฐานะผู้กอบกู้โลกเอลฟ์อย่างเต็มตัว'),

(2, 1, 'ทางเข้าสู่ป่าต้องห้าม', 
'<p>หลังจากได้ดาบในตำนาน คุณเดินทางมาถึงป่าต้องห้าม ต้นไม้รอบตัวสูงผิดธรรมชาติ และมีหมอกสีดำปกคลุมทั่วพื้นที่</p>
<p><strong>เบื้องหน้าคือประตูหินโบราณที่สลักอักขระเวทมนตร์</strong></p>', 
'normal', NULL, NULL, NULL),

(2, 1, 'เสียงเรียกจากเงามืด', 
'<p>คุณได้ยินเสียงกระซิบเรียกชื่อของคุณจากภายในป่าลึก เสียงนั้นฟังดูคุ้นเคยอย่างน่าประหลาด...</p>
<p><em>"จงเข้ามา... กัลเดรล... ความจริงรอเจ้าอยู่"</em></p>', 
'normal', NULL, NULL, NULL),

(2, 1, 'ห้องสมุดโบราณ', 
'<h2>ห้องสมุดต้องห้าม</h2>
<p>คุณเดินเข้ามาในห้องสมุดเก่าแก่ที่เต็มไปด้วยกลิ่นกระดาษและมนตรา บนกำแพงมีภาพเคลื่อนไหวเวทมนตร์ปรากฏขึ้นบอกเล่าเรื่องราวในอดีต</p>
<p><img src="http://localhost:9000/novels-images/library.jpg" alt="library" style="width:100%; border-radius:10px;" /></p>
<p><strong>คุณจะค้นหาข้อมูลเรื่องอะไรก่อน?</strong></p>', 
'normal', NULL, NULL, NULL),

(2, 1, 'ห้องลับใต้ต้นไม้โลก', 
'<p>กำแพงหินเลื่อนออกเผยให้เห็นห้องลับที่ซ่อนอยู่ใต้รากของต้นไม้โลก ที่นั่นมีหัวใจแห่งพฤกษาที่ยังคงเต้นอยู่เบาๆ</p>', 
'ending', 'ผู้พิทักษ์ต้นไม้โลก', 'secret', 'คุณตัดสินใจสละชีวิตทางโลกเพื่อกลายเป็นผู้พิทักษ์ความลับของโลกตลอดกาล');

-- ==========================================
-- LEVEL 6: ตารางที่ต้องอ้างอิง Scenes 
-- (Choices, Comments, History, Endings)
-- ==========================================

-- รวม Choices ทั้งหมด
INSERT INTO choices (choice_id, from_scene_id, to_scene_id, label) VALUES
(1, 1, 2, 'เดินไปทางลำธาร'),                    -- จาก 'ลืมตาตื่น' ไป 'ลำธารแห่งแสง'
(2, 1, 3, 'สำรวจรอยเท้าประหลาด'),               -- จาก 'ลืมตาตื่น' ไป 'รอยเท้าปีศาจ'
(3, 2, 4, 'หยิบดาบโบราณขึ้นมา'),                -- จาก 'ลำธารแห่งแสง' ไป 'ดาบโบราณ'
(4, 3, 5, 'ตามเสียงคำรามไป'),                   -- จาก 'รอยเท้าปีศาจ' ไป 'หมีกลายพันธุ์' (Bad Ending)
(5, 4, 6, 'ปลดปล่อยพลังเอลฟ์ในตัว'),             -- จาก 'ดาบโบราณ' ไป 'ผู้ถูกเลือก' (True Ending)
(6, 4, 7, 'ถือดาบแล้วมุ่งหน้าสู่ป่าต้องห้าม'),       -- จาก 'ดาบโบราณ' ไป 'ทางเข้าสู่ป่าต้องห้าม'
(7, 7, 8, 'เปิดประตูหินโบราณ'),                  -- จาก 'ทางเข้าสู่ป่าต้องห้าม' ไป 'เสียงเรียกจากเงามืด'
(8, 8, 9, 'เดินตามเสียงเข้าไปในหอสมุด'),          -- จาก 'เสียงเรียกจากเงามืด' ไป 'ห้องสมุดโบราณ'
(9, 9, 10, 'อ่านบันทึกลับเรื่องต้นไม้โลก');         -- จาก 'ห้องสมุดโบราณ' ไป 'ห้องลับใต้ต้นไม้โลก' (Secret Ending)

-- รีเซ็ต Serial ของ choice_id ให้เริ่มนับต่อจากเลขล่าสุด
SELECT setval('choices_choice_id_seq', (SELECT MAX(choice_id) FROM choices));

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