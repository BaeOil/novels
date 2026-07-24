import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, Hourglass, Ban, Search, Filter, Edit, Trash2, Eye, Award } from 'lucide-react';
import axios from 'axios';
import './Manageusers.css';

// รายการ Mock Users สำหรับเป็น Fallback ในกรณีที่ API Backend คืนค่า 404 หรือยังไม่เปิดใช้ท่อดึงข้อมูลผู้ใช้ทั้งหมด
const INITIAL_USERS = [
  { id: 1, username: "jing_handsomeandcool", email: "jing_cool@gmail.com", role: "Reader", status: "ปกติ", created_at: "2026-04-20" },
  { id: 2, username: "furby_wonderful", email: "furby2014@gmail.com", role: "Reader", status: "ปกติ", created_at: "2026-05-15" },
  { id: 3, username: "eieilnwza007", email: "lnwza007@gmail.com", role: "Writer", status: "ปกติ", created_at: "2026-04-10", writer_details: { name_lastname: "ศิริชัย เลิศล้ำ", pen_name: "นายหัวใจทอง", bio: "ผมรักการเขียนนิยายแฟนตาซีมากครับ ค้นคว้าเรื่องโลกเวทมนตร์มานาน หวังว่าทุกคนจะสนุกกับทางเลือกหลากหลายแบบนะครับ!", genres: ["แฟนตาซี", "ผจญภัย", "ไซไฟ"], primary_contact: "FB: Sirichai GoldenHeart" } },
  { id: 4, username: "67Gen_Z", email: "Gen_Zboy@gmail.com", role: "Reader", status: "รอยืนยัน", created_at: "2026-07-22" },
  { id: 5, username: "panda18kg", email: "bubududu@gmail.com", role: "Writer", status: "ระงับ", created_at: "2026-03-01", writer_details: { name_lastname: "นิชา สมบัติเจริญ", pen_name: "PandaWriter", bio: "หมีแพนด้าปั่นนิยายตลกและเรื่องราวดราม่าชีวิต มีความสุขทุกครั้งที่คนอ่านประหลาดใจกับฉากจบแบบพิเศษ", genres: ["ตลก", "ดราม่า", "โรแมนติก"], primary_contact: "Line: nichapanda" } },
  { id: 6, username: "micky_mouse", email: "micky_disney@gmail.com", role: "Reader", status: "ปกติ", created_at: "2026-06-18" },
  { id: 7, username: "storyverse_admin", email: "admin@storyverse.com", role: "Admin", status: "ปกติ", created_at: "2026-01-01" },
  { id: 8, username: "naruto_hokage", email: "naruto@konoha.com", role: "Writer", status: "ปกติ", created_at: "2026-02-12", writer_details: { name_lastname: "อุซึมากิ นารูโตะ", pen_name: "โฮคาเงะรุ่นเจ็ด", bio: "เขียนเรื่องราวการผจญภัยของเหล่านินจาผู้ไม่เคยย่อท้อต่ออุปสรรคใดๆ!", genres: ["ผจญภัย", "แอคชั่น"], primary_contact: "IG: naruto_orange" } },
  { id: 9, username: "sora_kingdom", email: "sora_heart@gmail.com", role: "Reader", status: "รอยืนยัน", created_at: "2026-07-20" },
  { id: 10, username: "charlie_brown", email: "charlie@peanuts.com", role: "Reader", status: "ระงับ", created_at: "2026-05-30" },
  { id: 11, username: "ironman_tony", email: "tony@stark.com", role: "Writer", status: "ปกติ", created_at: "2026-03-10", writer_details: { name_lastname: "โทนี่ สตาร์ค", pen_name: "IronWriter", bio: "นิยายไซไฟล้ำยุค ผสมผสานทฤษฎีควอนตัมฟิสิกส์ การเดินทางข้ามเวลาที่ไม่ซ้ำแบบใคร", genres: ["ไซไฟ", "แอคชั่น"], primary_contact: "starkindustries.com" } }
];

const Manageusers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ค้นหาและคัดกรอง
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); 
  const [statusFilter, setStatusFilter] = useState("all"); 

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [viewUserModal, setViewUserModal] = useState({ isOpen: false, user: null });
  const [viewApplicationModal, setViewApplicationModal] = useState({ isOpen: false, user: null });
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null, role: "Reader", status: "ปกติ" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, user: null });

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  // 🎯 ดึงข้อมูลรายชื่อผู้ใช้งานจาก API ระบบและนำมาแมปกับคำขอเขียนนิยายที่มีอยู่จริง
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. ดึงบัญชีผู้ใช้ทั้งหมดจาก API (ของ Go backend)
      let usersList = [];
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
        if (res.data) {
          const list = res.data.users || res.data.data || res.data;
          usersList = Array.isArray(list) ? list : [];
        }
      } catch (e) {
        console.warn("⚠️ API GET /api/admin/users not available, using fallback mock list:", e.message);
        usersList = INITIAL_USERS;
      }

      // 2. ดึงใบสมัครนักเขียนที่มีอยู่จริงในระบบมาแมปรายละเอียดประวัติ
      let applications = [];
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/writers/requests`, { headers });
        if (res.data) {
          applications = Array.isArray(res.data) ? res.data : [];
        }
      } catch (e) {
        console.warn("⚠️ Failed to load applications from API:", e.message);
      }

      // 3. แมปใบสมัครเข้ากับรายละเอียดนักเขียน
      const mappedUsers = usersList.map(u => {
        const app = applications.find(a => String(a.username) === String(u.username) || Number(a.user_id) === Number(u.id));
        if (app) {
          let genresList = ["ทั่วไป"];
          let primaryContact = "-";
          try {
            const parsedContact = typeof app.contact_info === 'string' ? JSON.parse(app.contact_info) : app.contact_info || {};
            genresList = parsedContact.genres || ["ทั่วไป"];
            primaryContact = parsedContact.primary_contact || "-";
          } catch {
            genresList = ["ทั่วไป"];
            primaryContact = "-";
          }

          return {
            ...u,
            writer_details: {
              name_lastname: app.name_lastname || "ไม่ระบุชื่อจริง",
              pen_name: app.pen_name || u.username,
              bio: app.bio || "ไม่มีการกรอกข้อมูลแนะนำตัว",
              genres: genresList,
              primary_contact: primaryContact
            }
          };
        }
        return u;
      });

      setUsers(mappedUsers);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. คำนวณยอดสถิติ
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === "ปกติ").length;
    const pending = users.filter(u => u.status === "รอยืนยัน").length;
    const suspended = users.filter(u => u.status === "ระงับ").length;
    return { active, pending, suspended, total: users.length };
  }, [users]);

  // 2. กรองและค้นหารายชื่อผู้ใช้
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = searchQuery.trim() === "" ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // 3. จัดการแบ่งหน้า
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // 4. จัดการอัปเดตผู้ใช้ (Edit)
  const handleUpdateUser = () => {
    const { user, role, status } = editUserModal;
    if (!user) return;
    
    setUsers(prev => prev.map(u => {
      if (u.id === user.id) {
        const isWriter = role === "Writer";
        const hasDetails = !!u.writer_details;
        const newDetails = isWriter && !hasDetails ? {
          name_lastname: "ไม่ระบุชื่อจริง",
          pen_name: u.username,
          bio: "ไม่มีประวัติข้อมูลแนะนำตัว",
          genres: ["ทั่วไป"],
          primary_contact: "-"
        } : u.writer_details;

        return {
          ...u,
          role,
          status,
          writer_details: role === "Writer" ? newDetails : undefined
        };
      }
      return u;
    }));

    setEditUserModal({ isOpen: false, user: null, role: "Reader", status: "ปกติ" });
  };

  // 5. จัดการลบผู้ใช้ (Delete)
  const handleDeleteUser = () => {
    const { user } = deleteConfirmModal;
    if (!user) return;

    setUsers(prev => prev.filter(u => u.id !== user.id));
    setDeleteConfirmModal({ isOpen: false, user: null });
  };

  return (
    <div className="admin-manage-users-panel">
      <div className="admin-container">
        
        {/* ส่วนหัวหน้าจัดการ */}
        <header className="admin-header-sec">
          <h1 className="admin-title">จัดการผู้ใช้งาน</h1>
          <p className="admin-subtitle">ผู้ใช้ทั้งหมด {stats.total.toLocaleString()} บัญชีในระบบ</p>
        </header>

        {/* 📊 การ์ดสถิติ */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card card-active">
            <div className="stat-card-left">
              <span className="stat-card-title">ปกติ</span>
              <span className="stat-card-number">{stats.active.toLocaleString()}</span>
            </div>
            <div className="stat-card-icon bg-green-light">
              <UserCheck size={28} color="#22c55e" />
            </div>
          </div>

          <div className="admin-stat-card card-pending">
            <div className="stat-card-left">
              <span className="stat-card-title">รอยืนยัน</span>
              <span className="stat-card-number">{stats.pending.toLocaleString()}</span>
            </div>
            <div className="stat-card-icon bg-yellow-light">
              <Hourglass size={28} color="#eab308" />
            </div>
          </div>

          <div className="admin-stat-card card-suspended">
            <div className="stat-card-left">
              <span className="stat-card-title">ระงับแล้ว</span>
              <span className="stat-card-number">{stats.suspended.toLocaleString()}</span>
            </div>
            <div className="stat-card-icon bg-red-light">
              <Ban size={28} color="#ef4444" />
            </div>
          </div>
        </section>

        {/* 🔍 ค้นหา & ฟิลเตอร์กรอง */}
        <section className="search-filter-section">
          <div className="search-box-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="ค้นหาชื่อผู้ใช้ , อีเมล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-controls-group">
            <div className="select-filter-wrapper">
              <Filter className="select-filter-icon" size={14} />
              <select
                className="admin-filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">บทบาททั้งหมด</option>
                <option value="Reader">Reader (นักอ่าน)</option>
                <option value="Writer">Writer (นักเขียน)</option>
                <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div className="select-filter-wrapper">
              <Filter className="select-filter-icon" size={14} />
              <select
                className="admin-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="ปกติ">ปกติ</option>
                <option value="รอยืนยัน">รอยืนยัน</option>
                <option value="ระงับ">ระงับแล้ว</option>
              </select>
            </div>
          </div>
        </section>

        {/* 📋 ตารางรายชื่อบัญชีผู้ใช้ */}
        {isLoading ? (
          <div className="admin-loading">กำลังดึงข้อมูลรายชื่อบัญชีผู้ใช้งานจากฐานระบบ...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-empty-state-panel">
            <div className="empty-panel-icon">🔍</div>
            <h3>ไม่พบผู้ใช้งานตรงกับเงื่อนไข</h3>
            <p>กรุณาตรวจสอบการสะกดคำ หรือเปลี่ยนตัวกรองบทบาท/สถานะ</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="users-admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อผู้ใช้</th>
                  <th>อีเมล</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>สมัครเมื่อ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={user.id || idx}>
                      <td className="row-num-col">{itemIndex}</td>
                      <td className="row-username-col">
                        <div className="user-initial-avatar">
                          {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="username-strong">{user.username}</span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${(user.role || 'Reader').toLowerCase()}`}>
                          {user.role || 'Reader'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${user.status === "ปกติ" ? "active" : user.status === "รอยืนยัน" ? "pending" : "suspended"}`}>
                          {user.status || "ปกติ"}
                        </span>
                      </td>
                      <td className="date-col">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("th-TH") : "-"}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-admin-action btn-detail"
                          onClick={() => setViewUserModal({ isOpen: true, user })}
                          title="ดูข้อมูลรายละเอียด"
                        >
                          <Eye size={14} /> รายละเอียด
                        </button>
                        
                        <button
                          className="btn-admin-action btn-edit-user"
                          onClick={() => setEditUserModal({ isOpen: true, user, role: user.role || "Reader", status: user.status || "ปกติ" })}
                          title="แก้ไขบัญชี"
                        >
                          <Edit size={14} /> แก้ไข
                        </button>

                        <button
                          className="btn-admin-action btn-delete-user"
                          onClick={() => setDeleteConfirmModal({ isOpen: true, user })}
                          title="ลบบัญชีผู้ใช้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ส่วนแบ่งหน้า Pagination */}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="page-nav-arrow"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  &larr; Prev
                </button>

                <div className="page-nums-list">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-num-btn ${currentPage === pageNum ? "active" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="page-nav-arrow"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 1. Modal ดูรายละเอียดผู้ใช้ ── */}
        {viewUserModal.isOpen && viewUserModal.user && (
          <div className="admin-modal-overlay" onClick={() => setViewUserModal({ isOpen: false, user: null })}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header-sec">
                <h2>รายละเอียดผู้ใช้งาน</h2>
                <button className="close-modal-x" onClick={() => setViewUserModal({ isOpen: false, user: null })}>×</button>
              </div>

              <div className="modal-body-content">
                <div className="modal-profile-header">
                  <div className="profile-large-avatar">
                    {viewUserModal.user.username ? viewUserModal.user.username.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="profile-head-info">
                    <h3>{viewUserModal.user.username}</h3>
                    <span className={`role-badge role-${(viewUserModal.user.role || 'Reader').toLowerCase()}`}>
                      {viewUserModal.user.role || 'Reader'}
                    </span>
                  </div>
                </div>

                <div className="modal-info-table">
                  <div className="info-row">
                    <span className="info-lbl">อีเมล:</span>
                    <span className="info-val">{viewUserModal.user.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-lbl">สมัครเมื่อ:</span>
                    <span className="info-val">
                      {viewUserModal.user.created_at ? new Date(viewUserModal.user.created_at).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-lbl">สถานะบัญชี:</span>
                    <span className={`info-val status-${viewUserModal.user.status === "ปกติ" ? "active" : viewUserModal.user.status === "รอยืนยัน" ? "pending" : "suspended"}`}>
                      {viewUserModal.user.status || "ปกติ"}
                    </span>
                  </div>
                </div>

                {/* หากมีบทบาทเป็น Writer และมีรายละเอียดประวัตินักเขียน */}
                {viewUserModal.user.role === "Writer" && viewUserModal.user.writer_details && (
                  <div className="writer-application-section-trigger">
                    <div className="trigger-left">
                      <Award size={18} color="#db2777" />
                      <span>มีประวัติใบสมัครนักเขียนในระบบ</span>
                    </div>
                    <button
                      type="button"
                      className="view-app-btn-trigger"
                      onClick={() => {
                        setViewApplicationModal({ isOpen: true, user: viewUserModal.user });
                        setViewUserModal({ isOpen: false, user: null });
                      }}
                    >
                      📄 ดูใบสมัครนักเขียน
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-footer-sec">
                <button type="button" className="admin-modal-btn cancel-btn" onClick={() => setViewUserModal({ isOpen: false, user: null })}>
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Modal ดูใบสมัครนักเขียน (เลียนแบบหน้าอนุมัติคำขอ) ── */}
        {viewApplicationModal.isOpen && viewApplicationModal.user && (
          <div className="admin-modal-overlay" onClick={() => setViewApplicationModal({ isOpen: false, user: null })}>
            <div className="admin-modal-content modal-content-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header-sec">
                <h2>ข้อมูลใบสมัครนักเขียน: {viewApplicationModal.user.username}</h2>
                <button 
                  className="close-modal-x" 
                  onClick={() => {
                    setViewUserModal({ isOpen: true, user: viewApplicationModal.user });
                    setViewApplicationModal({ isOpen: false, user: null });
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body-content">
                <div className="application-details-box">
                  <div className="details-group-box">
                    <h4>ข้อมูลผู้สมัคร</h4>
                    <div className="detail-field">
                      <span className="field-lbl">ชื่อ - นามสกุล:</span>
                      <span className="field-val">{viewApplicationModal.user.writer_details?.name_lastname || "-"}</span>
                    </div>
                    <div className="detail-field">
                      <span className="field-lbl">นามปากกา:</span>
                      <span className="field-val">{viewApplicationModal.user.writer_details?.pen_name || "-"}</span>
                    </div>
                    <div className="detail-field">
                      <span className="field-lbl">อีเมลติดต่อนักเขียน:</span>
                      <span className="field-val">{viewApplicationModal.user.email}</span>
                    </div>
                  </div>

                  <div className="details-group-box">
                    <h4>แนะนำตัว & แฟ้มผลงาน</h4>
                    <div className="details-bio-content">
                      {viewApplicationModal.user.writer_details?.bio || "ไม่มีการระบุประวัติหรือแนะนำตัว"}
                    </div>
                  </div>

                  <div className="details-group-box">
                    <h4>ประเภทนิยายที่เขียนหลัก</h4>
                    <div className="genres-chips-list">
                      {viewApplicationModal.user.writer_details?.genres?.map((g, index) => (
                        <span key={index} className="genre-chip">{g}</span>
                      )) || <span className="genre-chip">ทั่วไป</span>}
                    </div>
                  </div>

                  <div className="details-group-box">
                    <h4>ช่องทางการติดต่อหลัก</h4>
                    <div className="detail-field">
                      <span className="field-lbl">ลิงก์ติดต่อ:</span>
                      <span className="field-val highlight-link">
                        {viewApplicationModal.user.writer_details?.primary_contact && viewApplicationModal.user.writer_details.primary_contact.startsWith("http") ? (
                          <a href={viewApplicationModal.user.writer_details.primary_contact} target="_blank" rel="noopener noreferrer">
                            {viewApplicationModal.user.writer_details.primary_contact}
                          </a>
                        ) : (
                          viewApplicationModal.user.writer_details?.primary_contact || "-"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-sec">
                <button
                  type="button"
                  className="admin-modal-btn cancel-btn"
                  onClick={() => {
                    setViewUserModal({ isOpen: true, user: viewApplicationModal.user });
                    setViewApplicationModal({ isOpen: false, user: null });
                  }}
                >
                  ย้อนกลับ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Modal แก้ไขบทบาทและสถานะ ── */}
        {editUserModal.isOpen && editUserModal.user && (
          <div className="admin-modal-overlay" onClick={() => setEditUserModal({ isOpen: false, user: null, role: "Reader", status: "ปกติ" })}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header-sec">
                <h2>แก้ไขบัญชีผู้ใช้งาน: {editUserModal.user.username}</h2>
                <button className="close-modal-x" onClick={() => setEditUserModal({ isOpen: false, user: null, role: "Reader", status: "ปกติ" })}>×</button>
              </div>

              <div className="modal-body-content">
                <div className="edit-form-group">
                  <label className="form-lbl">บทบาท (Role)</label>
                  <select
                    className="admin-form-select"
                    value={editUserModal.role}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="Reader">Reader (นักอ่าน)</option>
                    <option value="Writer">Writer (นักเขียน)</option>
                    <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>

                <div className="edit-form-group" style={{ marginTop: "16px" }}>
                  <label className="form-lbl">สถานะบัญชี (Status)</label>
                  <select
                    className="admin-form-select"
                    value={editUserModal.status}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="รอยืนยัน">รอยืนยัน</option>
                    <option value="ระงับ">ระงับแล้ว</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer-sec">
                <button
                  type="button"
                  className="admin-modal-btn cancel-btn"
                  onClick={() => setEditUserModal({ isOpen: false, user: null, role: "Reader", status: "ปกติ" })}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="admin-modal-btn save-btn"
                  onClick={handleUpdateUser}
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Modal ยืนยันการลบผู้ใช้ ── */}
        {deleteConfirmModal.isOpen && deleteConfirmModal.user && (
          <div className="admin-modal-overlay" onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header-sec">
                <h2>ยืนยันการลบบัญชีผู้ใช้งาน</h2>
                <button className="close-modal-x" onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}>×</button>
              </div>

              <div className="modal-body-content">
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#334155", lineHeight: 1.5 }}>
                  คุณต้องการที่จะทำการลบบัญชีผู้ใช้งาน <strong style={{ color: "#db2777" }}>"{deleteConfirmModal.user.username}"</strong> ออกจากระบบอย่างถาวรหรือไม่?
                  <br />
                  <span style={{ color: "#ef4444", fontSize: "0.82rem", fontWeight: 700 }}>⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้ในภายหลัง</span>
                </p>
              </div>

              <div className="modal-footer-sec">
                <button
                  type="button"
                  className="admin-modal-btn cancel-btn"
                  onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="admin-modal-btn danger-btn"
                  onClick={handleDeleteUser}
                >
                  ยืนยันลบถาวร
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Manageusers;