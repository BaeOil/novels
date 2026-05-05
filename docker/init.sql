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