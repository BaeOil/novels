import { useEffect, useState } from "react";
import WriterCard from "../../../components/WriterCard/WriterCard"; // เรียกใช้ Component ย่อยที่แยกออกมา
import "./FollowingWriters.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function stripHTML(value) {
  if (!value || typeof value !== "string") return null;
  return value.replace(/<[^>]*>/g, "").trim();
}

function normalizeNovel(novel) {
  if (!novel || typeof novel !== "object") return null;
  return {
    id: novel.novel_id ?? novel.id ?? novel.novelId,
    title: novel.title || novel.name || "ไม่ทราบชื่อเรื่อง",
    status: novel.status || novel.state || "ongoing",
    cover: novel.cover || novel.cover_image || novel.coverImage || novel.thumbnail || null,
    chapterCount: novel.chapter_count ?? novel.chapterCount ?? 0,
  };
}

function mapWriter(writer) {
  const rawBio = writer.bio || writer.description || writer.bio_html || writer.bioHtml || null;
  const plainBio = stripHTML(rawBio);
  const novels = Array.isArray(writer.novels)
    ? writer.novels.map(normalizeNovel).filter(Boolean)
    : [];

  return {
    id: writer.writer_id ?? writer.id,
    name: writer.pen_name || writer.name || writer.name_lastname || "นักเขียน",
    bio: plainBio || null,
    avatar: writer.avatar_url || writer.avatar || writer.avatarUrl || null,
    color: writer.color || ["#6D28D9", "#E91E8C", "#0F766E", "#0EA5E9"][Math.abs((writer.writer_id ?? writer.id ?? 0) % 4)],
    followers: writer.follower_count ?? writer.total_like_count ?? writer.followers ?? 0,
    novelCount: writer.novel_count ?? novels.length,
    hasUnreadUpdate: Boolean(writer.has_unread_update || writer.hasUnreadUpdate || writer.latest_update || writer.latestUpdate),
    novels,
    latestUpdate: writer.latest_update || writer.latestUpdate || null,
  };
}

export default function FollowingWriters() {
  const [writers, setWriters] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const SORT_OPTIONS = {
    recent:    "อัปเดตล่าสุด",
    followers: "ผู้ติดตามมากสุด",
    name:      "ตามชื่อ",
  };

  useEffect(() => {
    const fetchFollowingWriters = async () => {
      const token = localStorage.getItem("token");
      
      // อ่านข้อมูลจาก LocalStorage เสมอเพื่อเตรียมไว้สำหรับ Fallback/Merge
      let localWriters = [];
      try {
        const localSaved = localStorage.getItem("local_following_writers");
        const list = localSaved ? JSON.parse(localSaved) : [];
        localWriters = Array.isArray(list) ? list.map(mapWriter) : [];
      } catch (e) {
        console.warn("Failed to read local following writers:", e);
      }

      if (!token) {
        // หากไม่มี token ให้ใช้เฉพาะข้อมูลจาก LocalStorage เพื่อให้ใช้งานหน้าหลักซิงค์มาหน้าติดตามได้
        setWriters(localWriters);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/users/following-writers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "โหลดรายการนักเขียนที่ติดตามไม่สำเร็จ");
        }

        const payload = await response.json().catch(() => null) || {};
        const body = payload?.data ?? payload ?? {};
        const followedArray = Array.isArray(body) ? body : (body.following || body.writers || []);
        const followedWriters = Array.isArray(followedArray) ? followedArray.map(mapWriter) : [];
        
        // ผนวกรวมข้อมูลจาก API และ LocalStorage โดยไม่ให้ไอดีทับซ้อนกัน
        const mergedList = [...followedWriters];
        localWriters.forEach(lw => {
          if (!mergedList.some(w => Number(w.id) === Number(lw.id))) {
            mergedList.push(lw);
          }
        });

        setWriters(mergedList);
        setError("");
      } catch (err) {
        console.error("โหลดรายการนักเขียนที่ติดตามล้มเหลว:", err);
        // หาก API ล้มเหลว ให้ใช้ข้อมูลจาก LocalStorage แทนเพื่อไม่ให้หน้าว่างเปล่า
        setWriters(localWriters);
        setError("");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingWriters();
  }, []);

  const handleUnfollow = async (id) => {
    // 1. อัปเดต UI ทันที
    setWriters(p => p.filter(w => w.id !== id));
    
    // 2. อัปเดตและซิงค์ลบออกจาก LocalStorage
    try {
      const saved = localStorage.getItem("local_following_writers");
      let list = saved ? JSON.parse(saved) : [];
      list = list.filter(w => Number(w.id) !== Number(id));
      localStorage.setItem("local_following_writers", JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to remove from local_following_writers:", e);
    }

    // 3. เรียก API ลบออกจากระบบ Backend จริง (ถ้ามี Token)
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/writers/${id}/unfollow`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      } catch (e) {
        console.warn("API unfollow request warning:", e.message);
      }
    }
  };

  let visible = writers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.novels.some(n => n.title.includes(search))
  );
  if (sort === "followers") visible = [...visible].sort((a,b) => b.followers - a.followers);
  if (sort === "name")      visible = [...visible].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="container">
      {/* Header (ลบจำนวนตอนจบรวมออกไปแล้ว เหลือแค่จำนวนคนตามบรีฟ) */}
      <div className="header">
        <div className="headerContent">
          <button className="backBtn">←</button>
          <div>
            <div className="headerTitle">นักเขียนที่ติดตาม</div>
            <div className="headerSubtitle">{loading ? "กำลังโหลด..." : `${writers.length} คน`}</div>
          </div>
        </div>
      </div>

      <div className="wrapper">
        {/* search + sort */}
        <div className="filterRow">
          <div className="searchBar">
            <span className="searchIcon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อนักเขียนหรือนิยาย..."
              className="searchInput"
            />
            {search && (
              <button onClick={() => setSearch("")} className="clearBtn">✕</button>
            )}
          </div>

          <div className="sortWrapper">
            <button onClick={() => setShowSort(p => !p)} className="sortTrigger">
              ↕ <span className="sortLabel">{SORT_OPTIONS[sort]}</span>
            </button>
            
            {showSort && (
              <>
                <div onClick={() => setShowSort(false)} className="backdrop" />
                <div className="dropdownMenu">
                  {Object.entries(SORT_OPTIONS).map(([k, v]) => (
                    <button 
                      key={k} 
                      onClick={() => { setSort(k); setShowSort(false); }} 
                      className={`dropdownItem ${sort === k ? "dropdownItemActive" : ""}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="emptyState">
            <div className="emptyIcon">⚠️</div>
            <div className="emptyTitle">ไม่สามารถโหลดข้อมูลได้</div>
            <div className="emptyText">{error}</div>
          </div>
        )}

        {!error && visible.length === 0 ? (
          <div className="emptyState">
            <div className="emptyIcon">{search ? "🔍" : "✍️"}</div>
            <div className="emptyTitle">
              {search ? "ไม่พบนักเขียนที่ค้นหา" : "ยังไม่ได้ติดตามนักเขียนคนไหน"}
            </div>
            <div className="emptyText">
              {search ? "ลองเปลี่ยนคำค้นหาดูนะ" : "ไปค้นหานักเขียนที่ชอบแล้วกดติดตามได้เลย"}
            </div>
          </div>
        ) : (
          <div className="listGrid">
            {visible.map(w => (
              <WriterCard key={w.id} writer={w} onUnfollow={handleUnfollow} isFollowing={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}