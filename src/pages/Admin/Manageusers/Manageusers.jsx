import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, FileClock, Ban, Search, Filter, Edit, Trash2, Eye, Award, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import './Manageusers.css';

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
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null, username: "", role: "reader", status: "active", reason: "" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, user: null });

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  // 🔑 ดึง token + header มาตรฐานสำหรับทุก request
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // 🙋 อ่าน user_id ของแอดมินที่ล็อกอินอยู่ตอนนี้ จาก JWT payload
  // ใช้กันไม่ให้แอดมินกดจัดการ/ลบ/ระงับบัญชีตัวเอง (ฝั่ง backend ก็เช็คซ้ำอีกชั้นอยู่แล้ว)
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id ?? payload.id ?? payload.sub ?? null;
    } catch {
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  // 🎯 ดึงข้อมูลรายชื่อผู้ใช้งานจาก API จริง (/api/admin/users)
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      const list = res.data?.users || res.data?.data || res.data;
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน กรุณาลองใหม่อีกครั้ง");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. คำนวณยอดสถิติ
  // หมายเหตุ: users.status มีแค่ active / suspended เท่านั้น (ไม่มี pending อีกต่อไป)
  // ส่วน "คำขอนักเขียนรอตรวจสอบ" มาจาก writer_application_status ของแต่ละ user แทน
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === "active").length;
    const suspended = users.filter(u => u.status === "suspended").length;
    const pendingWriterApps = users.filter(u => u.writer_application_status === "pending").length;
    return { active, suspended, pendingWriterApps, total: users.length };
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

  // 3.1 ตัดเลขหน้าให้พอดี (แสดงหน้าแรก/หน้าสุดท้าย/หน้าใกล้ปัจจุบัน + จุดไข่ปลา)
  //     ป้องกันแถวปุ่มยาวเกินหน้าจอเมื่อมีผู้ใช้เยอะ
  const pageItems = useMemo(() => {
    const items = [];
    const addNeighborsOf = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    let lastAdded = 0;
    for (let p = 1; p <= totalPages; p++) {
      if (addNeighborsOf.has(p)) {
        if (p - lastAdded > 1) items.push({ type: "ellipsis", key: `e${p}` });
        items.push({ type: "page", value: p });
        lastAdded = p;
      }
    }
    return items;
  }, [totalPages, currentPage]);

  const [isUpdating, setIsUpdating] = useState(false);

  // 4. จัดการอัปเดตผู้ใช้ (Edit) — เรียก backend จริง 2 endpoint แยกกัน
  //    - username: PATCH /api/admin/users/{id}/username
  //    - demote: ใช้เฉพาะกรณี writer -> reader เท่านั้น (ทิศทางเดียว ห้ามตั้งเป็น writer/admin จากหน้านี้)
  //    - status: ใช้เปลี่ยน active <-> suspended เท่านั้น
  const handleUpdateUser = async () => {
    const { user, username, role, status, reason } = editUserModal;
    if (!user || isUpdating) return;

    const trimmedUsername = (username || "").trim();
    if (!trimmedUsername) {
      alert("กรุณากรอกชื่อผู้ใช้");
      return;
    }

    setIsUpdating(true);
    try {
      const headers = getAuthHeaders();

      if (trimmedUsername !== user.username) {
        await axios.patch(
          `${API_BASE_URL}/api/admin/users/${user.id}/username`,
          { username: trimmedUsername },
          { headers }
        );
      }

      if (user.role === "writer" && role === "reader") {
        await axios.patch(`${API_BASE_URL}/api/admin/users/${user.id}/demote`, {}, { headers });
      }

      if (status !== user.status) {
        await axios.patch(
          `${API_BASE_URL}/api/admin/users/${user.id}/status`,
          { status, reason: status === "suspended" ? reason : undefined },
          { headers }
        );
      }

      await loadData();
      setEditUserModal({ isOpen: false, user: null, username: "", role: "reader", status: "active", reason: "" });
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 400) {
        alert(err.response?.data?.error || err.response?.data?.message || "username ไม่ถูกต้อง");
      } else if (status === 409) {
        alert(err.response?.data?.error || err.response?.data?.message || "username ซ้ำ");
      } else if (status === 401) {
        alert(err.response?.data?.error || err.response?.data?.message || "token หมดอายุ");
      } else if (status === 403) {
        alert(err.response?.data?.error || err.response?.data?.message || "ไม่มีสิทธิ์ admin");
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. จัดการลบผู้ใช้ (Delete) — เรียก backend จริง และ handle กรณี 409
  //    (writer ที่มีนิยายอยู่ในระบบ ห้ามลบถาวร ต้องระงับบัญชีแทน)
  const handleDeleteUser = async () => {
    const { user } = deleteConfirmModal;
    if (!user) return;

    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/api/admin/users/${user.id}`, { headers });
      setDeleteConfirmModal({ isOpen: false, user: null });
      await loadData();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        alert("ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีนิยายอยู่ในระบบ\nกรุณาระงับบัญชีแทนการลบ");
      } else if (err.response?.status === 403) {
        alert("ไม่สามารถดำเนินการกับบัญชีของตัวเองได้");
      } else {
        alert("เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน กรุณาลองใหม่อีกครั้ง");
      }
      setDeleteConfirmModal({ isOpen: false, user: null });
    }
  };

  const statusLabel = (status) => (status === "active" ? "ปกติ" : status === "suspended" ? "ระงับแล้ว" : "-");
  const statusClass = (status) => (status === "active" ? "active" : status === "suspended" ? "suspended" : "pending");
  const roleLabel = (role) => {
    if (role === "reader") return "นักอ่าน";
    if (role === "writer") return "นักเขียน";
    if (role === "admin") return "ผู้ดูแลระบบ";
    return role || "นักอ่าน";
  };

  return (
    <div className="admin-manage-users-panel">
      <div className="admin-container">

        {/* ส่วนหัวหน้าจัดการ */}
        <header className="admin-header-sec">
          <h1 className="admin-title">จัดการผู้ใช้งาน</h1>
          <p className="admin-subtitle">ผู้ใช้ทั้งหมด {stats.total.toLocaleString()} บัญชีในระบบ</p>
          <svg className="header-branch-accent" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 8 H70 M70 8 C 78 8, 78 2, 86 2 H130 M70 8 C 78 8, 78 14, 86 14 H130 M130 2 H200 M130 14 H160" />
          </svg>
        </header>

        {/* 📊 การ์ดสถิติ — กดเพื่อกรองตารางด้านล่างได้เลย (เหมือนหน้า Reports / คำขอนักเขียน) */}
        <section className="admin-stats-grid">
          <button
            type="button"
            className={`admin-stat-card card-active ${statusFilter === "active" ? "admin-stat-card--selected" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
            aria-pressed={statusFilter === "active"}
          >
            <div className="stat-card-icon bg-green-light">
              <UserCheck size={20} />
            </div>
            <div className="stat-card-left">
              <span className="stat-card-title">ปกติ</span>
              <span className="stat-card-number">{stats.active.toLocaleString()}</span>
            </div>
          </button>

          {/* คำขอนักเขียนอนุมัติที่หน้า Writers เท่านั้น (ไม่ใช่กรองในหน้านี้) จึงเป็นลิงก์นำทาง ไม่ใช่ตัวกรอง */}
          <a href="/admin/manage-users" className="admin-stat-card card-pending">
            <div className="stat-card-icon bg-yellow-light">
              <FileClock size={20} />
            </div>
            <div className="stat-card-left">
              <span className="stat-card-title">คำขอนักเขียนรอตรวจสอบ</span>
              <span className="stat-card-number">{stats.pendingWriterApps.toLocaleString()}</span>
            </div>
          </a>

          <button
            type="button"
            className={`admin-stat-card card-suspended ${statusFilter === "suspended" ? "admin-stat-card--selected" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "suspended" ? "all" : "suspended")}
            aria-pressed={statusFilter === "suspended"}
          >
            <div className="stat-card-icon bg-red-light">
              <Ban size={20} />
            </div>
            <div className="stat-card-left">
              <span className="stat-card-title">ระงับแล้ว</span>
              <span className="stat-card-number">{stats.suspended.toLocaleString()}</span>
            </div>
          </button>
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
                <option value="reader">นักอ่าน</option>
                <option value="writer">นักเขียน</option>
                <option value="admin">ผู้ดูแลระบบ</option>
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
                <option value="active">ปกติ</option>
                <option value="suspended">ระงับแล้ว</option>
              </select>
            </div>
          </div>
        </section>

        {/* 📋 ตารางรายชื่อบัญชีผู้ใช้ */}
        {isLoading ? (
          <div className="admin-loading">
            <Loader2 className="loading-spin" size={22} />
            <span>กำลังดึงข้อมูลรายชื่อบัญชีผู้ใช้งานจากฐานระบบ...</span>
          </div>
        ) : error ? (
          <div className="admin-error">
            <AlertTriangle size={22} />
            <div>
              <strong>โหลดข้อมูลไม่สำเร็จ</strong>
              <p>{error}</p>
              <button type="button" className="retry-btn" onClick={loadData}>ลองใหม่อีกครั้ง</button>
            </div>
          </div>
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
                  <th>สถานะบัญชี</th>
                  <th>คำขอนักเขียน</th>
                  <th>สมัครเมื่อ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelf = currentUserId != null && String(user.id) === String(currentUserId);
                  return (
                    <tr key={user.id || idx}>
                      <td className="row-num-col">{itemIndex}</td>
                      <td className="row-username-col">
                        {user.pic_profile ? (
                          <img
                            src={user.pic_profile}
                            alt={user.username}
                            className="user-avatar-img"
                            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                          />
                        ) : null}
                        <div className="user-initial-avatar" style={user.pic_profile ? { display: "none" } : undefined}>
                          {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="username-strong">{user.username}</span>
                        {isSelf && <span className="self-tag">คุณ</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${(user.role || 'reader').toLowerCase()}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${statusClass(user.status)}`}>
                          {statusLabel(user.status)}
                        </span>
                      </td>
                      <td>
                        {user.writer_application_status === "pending" ? (
                          <span className="status-badge status-pending">รอตรวจสอบ</span>
                        ) : (
                          <span className="cell-muted">-</span>
                        )}
                      </td>
                      <td className="date-col">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("th-TH") : "-"}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon-action btn-detail"
                          onClick={() => setViewUserModal({ isOpen: true, user })}
                          title="ดูข้อมูลรายละเอียด"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="btn-icon-action btn-edit-user"
                          onClick={() => setEditUserModal({ isOpen: true, user, username: user.username || "", role: user.role || "reader", status: user.status || "active", reason: "" })}
                          title={isSelf ? "ไม่สามารถแก้ไขบัญชีของตัวเองได้" : "แก้ไขบัญชี"}
                          disabled={isSelf}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          className="btn-icon-action btn-delete-user"
                          onClick={() => setDeleteConfirmModal({ isOpen: true, user })}
                          title={isSelf ? "ไม่สามารถลบบัญชีของตัวเองได้" : "ลบบัญชีผู้ใช้"}
                          disabled={isSelf}
                        >
                          <Trash2 size={16} />
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
                  &larr; ก่อนหน้า
                </button>

                <div className="page-nums-list">
                  {pageItems.map((item) =>
                    item.type === "ellipsis" ? (
                      <span key={item.key} className="page-ellipsis">…</span>
                    ) : (
                      <button
                        key={item.value}
                        type="button"
                        className={`page-num-btn ${currentPage === item.value ? "active" : ""}`}
                        onClick={() => setCurrentPage(item.value)}
                      >
                        {item.value}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="page-nav-arrow"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป &rarr;
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
                  {viewUserModal.user.pic_profile ? (
                    <img
                      src={viewUserModal.user.pic_profile}
                      alt={viewUserModal.user.username}
                      className="profile-large-avatar-img"
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                    />
                  ) : null}
                  <div className="profile-large-avatar" style={viewUserModal.user.pic_profile ? { display: "none" } : undefined}>
                    {viewUserModal.user.username ? viewUserModal.user.username.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="profile-head-info">
                    <h3>{viewUserModal.user.username}</h3>
                    <span className={`role-badge role-${(viewUserModal.user.role || 'reader').toLowerCase()}`}>
                      {roleLabel(viewUserModal.user.role)}
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
                    <span className={`info-val status-${statusClass(viewUserModal.user.status)}`}>
                      {statusLabel(viewUserModal.user.status)}
                    </span>
                  </div>
                  {viewUserModal.user.status === "suspended" && viewUserModal.user.suspended_reason && (
                    <div className="info-row">
                      <span className="info-lbl">เหตุผลการระงับ:</span>
                      <span className="info-val">{viewUserModal.user.suspended_reason}</span>
                    </div>
                  )}
                </div>

                {/* หากมีบทบาทเป็น Writer และมีรายละเอียดประวัตินักเขียน */}
                {viewUserModal.user.role === "writer" && viewUserModal.user.writer_details && (
                  <div className="writer-application-section-trigger">
                    <div className="trigger-left">
                      <Award size={18} color="#db2777" />
                      <span>
                        {viewUserModal.user.writer_application_status === "pending"
                          ? "มีใบสมัครนักเขียนรอการตรวจสอบ"
                          : "มีประวัติใบสมัครนักเขียนในระบบ"}
                      </span>
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
                {viewUserModal.user.role === "writer" && (() => {
                  const writerId = viewUserModal.user.writer_details?.writer_id || viewUserModal.user.writer_id || viewUserModal.user.writer_details?.id || viewUserModal.user.id;
                  return (
                    <a
                      href={`/writer/profile/${writerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-modal-btn view-writer-profile-btn"
                    >
                      <ExternalLink size={15} />
                      <span>ดูโปรไฟล์นักเขียน</span>
                    </a>
                  );
                })()}
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
                      {(() => {
                        const rawBio = viewApplicationModal.user.writer_details?.bio || viewApplicationModal.user.bio || "";
                        const cleanBio = rawBio.replace(/<[^>]*>/g, "").trim();
                        return cleanBio || "ไม่มีการระบุประวัติหรือแนะนำตัว";
                      })()}
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
                    <h4>ช่องทางการติดต่อ</h4>
                    {(() => {
                      const wd = viewApplicationModal.user.writer_details || {};
                      const renderContact = (value) => {
                        if (!value) return "-";
                        return value.startsWith("http") ? (
                          <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                        ) : (
                          value
                        );
                      };
                      return (
                        <>
                          <div className="detail-field">
                            <span className="field-lbl">ช่องทางหลัก:</span>
                            <span className="field-val highlight-link">{renderContact(wd.primary_contact)}</span>
                          </div>
                          <div className="detail-field">
                            <span className="field-lbl">ช่องทางรอง:</span>
                            <span className="field-val highlight-link">{renderContact(wd.secondary_contact)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {viewApplicationModal.user.writer_application_status === "pending" && (
                    <div className="writer-application-section-trigger">
                      <div className="trigger-left">
                        <Award size={18} color="#db2777" />
                        <span>คำขอนี้ยังรอการอนุมัติ</span>
                      </div>
                      <a className="view-app-btn-trigger view-app-btn-trigger--link" href="/admin/writers">
                        ไปตรวจสอบที่หน้า Writers
                      </a>
                    </div>
                  )}
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
          <div className="admin-modal-overlay" onClick={() => setEditUserModal({ isOpen: false, user: null, username: "", role: "reader", status: "active", reason: "" })}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header-sec">
                <h2>แก้ไขบัญชีผู้ใช้งาน: {editUserModal.user.username}</h2>
                {/* หมายเหตุ: หัวข้อ modal ยึดชื่อเดิมของบัญชีไว้ ไม่เปลี่ยนตามที่พิมพ์ใน input ด้านล่าง เพื่อไม่ให้สับสนว่ากำลังแก้ไขบัญชีไหน */}
                <button className="close-modal-x" onClick={() => setEditUserModal({ isOpen: false, user: null, username: "", role: "reader", status: "active", reason: "" })}>×</button>
              </div>

              <div className="modal-body-content">
                <div className="edit-form-group">
                  <label className="form-lbl">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    className="admin-form-select"
                    value={editUserModal.username}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="กรอกชื่อผู้ใช้ใหม่"
                    maxLength={50}
                  />
                </div>

                <div className="edit-form-group">
                  <label className="form-lbl">บทบาท</label>

                  {/* กฎสำคัญ: หน้านี้ "ถอด" สิทธิ์นักเขียนได้อย่างเดียว (writer -> reader)
                      ห้ามตั้ง role เป็น writer หรือ admin จากหน้านี้เด็ดขาด
                      การมอบสิทธิ์ writer ต้องผ่านหน้าอนุมัติใบสมัคร (/admin/writers) เท่านั้น */}
                  {editUserModal.user.role === "writer" ? (
                    <select
                      className="admin-form-select"
                      value={editUserModal.role}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="writer">นักเขียน (ไม่เปลี่ยนแปลง)</option>
                      <option value="reader">เลื่อนลง → นักอ่าน (ถอดสิทธิ์นักเขียน)</option>
                    </select>
                  ) : (
                    <div className="admin-form-select admin-form-select--readonly">
                      {roleLabel(editUserModal.user.role)} (ไม่สามารถเปลี่ยนบทบาทจากหน้านี้ได้)
                    </div>
                  )}
                </div>

                <div className="edit-form-group">
                  <label className="form-lbl">สถานะบัญชี</label>
                  <select
                    className="admin-form-select"
                    value={editUserModal.status}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">ปกติ</option>
                    <option value="suspended">ระงับแล้ว</option>
                  </select>
                </div>

                {editUserModal.status === "suspended" && (
                  <div className="edit-form-group">
                    <label className="form-lbl">เหตุผลการระงับ (ไม่บังคับ)</label>
                    <textarea
                      className="admin-form-select admin-form-textarea"
                      placeholder="เช่น สแปม, โพสต์เนื้อหาไม่เหมาะสม, ถูกรายงานหลายครั้ง..."
                      value={editUserModal.reason}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer-sec">
                <button
                  type="button"
                  className="admin-modal-btn cancel-btn"
                  onClick={() => setEditUserModal({ isOpen: false, user: null, username: "", role: "reader", status: "active", reason: "" })}
                  disabled={isUpdating}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="admin-modal-btn save-btn"
                  onClick={handleUpdateUser}
                  disabled={isUpdating}
                >
                  {isUpdating ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
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
                <p className="delete-warning-text">
                  คุณต้องการที่จะทำการลบบัญชีผู้ใช้งาน <strong className="delete-warning-username">"{deleteConfirmModal.user.username}"</strong> ออกจากระบบอย่างถาวรหรือไม่?
                  <br />
                  <span className="delete-warning-critical">⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้ในภายหลัง</span>
                  <br />
                  <span className="delete-warning-note">
                    หมายเหตุ: ถ้าบัญชีนี้เป็นนักเขียนที่มีนิยายอยู่ในระบบ ระบบจะไม่อนุญาตให้ลบ กรุณาระงับบัญชีแทน
                  </span>
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