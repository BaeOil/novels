import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Manageusers.css';

// ─────────────────────────────────────────────
//  Modal Components
// ─────────────────────────────────────────────

// Action confirmation modal
const ActionConfirmModal = ({
  isOpen,
  title,
  message,
 confirmText,
  confirmClass,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn modal-btn--cancel"
            onClick={onCancel}
          >
            ยกเลิก
          </button>

          <button
            className={`modal-btn ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// View user modal
const EditUserModal = ({ isOpen, user, onCancel }) => {
  if (!isOpen || !user) return null;

  const contactInfo = (() => {
    try {
      return typeof user.contact_info === 'string' ? JSON.parse(user.contact_info) : user.contact_info || {};
    } catch {
      return {};
    }
  })();

  const writerData = {
    fullName: user.name_lastname || 'ไม่ระบุ',
    penName: user.pen_name || user.username,
    email: user.email_writer || user.username,
    bio: user.bio || 'ไม่ระบุ',
    genres: contactInfo.genres || [],
    mainContact: contactInfo.primary_contact || '-',
    avatarUrl: null
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ข้อมูลใบสมัครนักเขียน</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3 className="modal-section__title">ข้อมูลพื้นฐาน</h3>

            <div className="modal-info-row">
              <span className="modal-info-label">ชื่อผู้ใช้:</span>
              <span className="modal-info-value">{user.username}</span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">บทบาท:</span>
              <span className="modal-info-value">
                <span className="role-badge role-reader">Reader</span>
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">สถานะ:</span>
              <span className="modal-info-value">
                <span className="status-badge status-pending">
                  {user.status}
                </span>
              </span>
            </div>
          </div>

          <div className="modal-section">
            <h3 className="modal-section__title">ข้อมูลนักเขียน</h3>

            <div className="modal-info-row">
              <span className="modal-info-label">ชื่อ - นามสกุล:</span>
              <span className="modal-info-value">{writerData.fullName}</span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">นามปากกา:</span>
              <span className="modal-info-value">{writerData.penName}</span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">อีเมล:</span>
              <span className="modal-info-value">{writerData.email}</span>
            </div>
          </div>

          <div className="modal-section">
            <h3 className="modal-section__title">แนะนำตัว</h3>
            <p className="modal-bio">{writerData.bio}</p>
          </div>

          <div className="modal-section">
            <h3 className="modal-section__title">ประเภทนิยาย</h3>
            <div className="modal-genres">
              {writerData.genres.map((genre, idx) => (
                <span key={idx} className="modal-genre-tag">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <h3 className="modal-section__title">ช่องทางติดต่อ</h3>

            <div className="modal-info-row">
              <span className="modal-info-label">หลัก:</span>

              <span className="modal-info-value">
                <a href={writerData.mainContact} target="_blank" rel="noopener noreferrer">
                  {writerData.mainContact}
                </a>
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn--cancel" onClick={onCancel}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Admin Sidebar Component
// ─────────────────────────────────────────────

const AdminSidebar = ({ currentPage, onNavigate }) => {
  const navigate = useNavigate();

  const MENU_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard แอดมิน',
      icon: '📊',
    },
    {
      id: 'manage-users',
      label: 'จัดการผู้ใช้งาน',
      icon: '👥',
    },
    {
      id: 'manage-novels',
      label: 'จัดการนิยาย',
      icon: '📚',
    },
    {
      id: 'reports',
      label: 'รายงาน',
      icon: '📈',
    },
    {
      id: 'logout',
      label: 'ออกจากระบบ',
      icon: '➜]',
    },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__logo">
        <div className="admin-sidebar__logo-icon">📱</div>

        <div className="admin-sidebar__logo-text">
          <span className="admin-sidebar__logo-story">Story</span>
          <span className="admin-sidebar__logo-verse">Verse</span>
          <span className="admin-sidebar__logo-mode">ADMIN CONSOLE</span>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`admin-sidebar__item ${currentPage === item.id ? 'admin-sidebar__item--active' : ''}`}
            onClick={() => {
              if (item.id === 'logout') {
                navigate('/login-register');
              } else {
                onNavigate(item.id);
              }
            }}
          >
            <span className="admin-sidebar__item-icon">{item.icon}</span>
            <span className="admin-sidebar__item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar__spacer" />

      <div className="admin-sidebar__bottom">
        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__profile-av">👨‍💼</div>

          <div>
            <div className="admin-sidebar__profile-name">Admin User</div>
            <div className="admin-sidebar__profile-role">ผู้ดูแล</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────

const Manageusers = ({ onNavigate = () => {} }) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editModal, setEditModal] = useState({
    isOpen: false,
    user: null
  });

  const [actionModal, setActionModal] = useState({
    isOpen: false,
    writerId: null,
    action: '',
    userName: ''
  });

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/writers/requests', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('ไม่สามารถดึงคำขอได้');
        }
        const data = await res.json();
        setRequests(data || []);
      } catch (err) {
        console.error('Failed to load writer requests:', err);
        setError('ไม่สามารถโหลดคำขอสมัครนักเขียนได้ในขณะนี้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleApproveWriter = async (writerId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/writers/approve?writer_id=${writerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'ไม่สามารถอนุมัติคำขอได้');
      }
      setRequests((prev) => prev.filter((item) => item.writer_id !== writerId));
      setActionModal({ isOpen: false, writerId: null, action: '', userName: '' });
    } catch (err) {
      console.error('Approve writer failed:', err);
      alert(err.message || 'เกิดข้อผิดพลาดขณะอนุมัติ');
    }
  };

  const handleRejectWriter = async (writerId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/writers/reject?writer_id=${writerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'ไม่สามารถปฏิเสธคำขอได้');
      }
      setRequests((prev) => prev.filter((item) => item.writer_id !== writerId));
      setActionModal({ isOpen: false, writerId: null, action: '', userName: '' });
    } catch (err) {
      console.error('Reject writer failed:', err);
      alert(err.message || 'เกิดข้อผิดพลาดขณะปฏิเสธ');
    }
  };

  const handleEditUser = (user) => {
    setEditModal({ isOpen: true, user });
  };

  const handleCancelEdit = () => {
    setEditModal({
      isOpen: false,
      user: null
    });
  };

  const handleActionClick = (writerId, userName, action) => {
    setActionModal({
      isOpen: true,
      writerId,
      userName,
      action
    });
  };

  const handleConfirmAction = () => {
    if (actionModal.action === 'approve') {
      handleApproveWriter(actionModal.writerId);
    } else {
      handleRejectWriter(actionModal.writerId);
    }
  };

  const handleCancelAction = () => {
    setActionModal({
      isOpen: false,
      writerId: null,
      action: '',
      userName: ''
    });
  };

  const getRoleLabel = (role) => {
    return role === 'Writer' ? 'Writer' : 'Reader';
  };

  const getRoleClass = (role) => {
    return role === 'Writer' ? 'role-writer' : 'role-reader';
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        currentPage="manage-users"
        onNavigate={onNavigate}
      />

      <div className="manageusers-container">
        <div className="manageusers-header">
          <h1 className="manageusers-header__title">
            ตรวจสอบคำขอนักเขียน
          </h1>

          <p className="manageusers-header__sub">
            คำขอทั้งหมด {requests.length} รายการ
          </p>
        </div>

        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อผู้ใช้</th>
                <th>อีเมล</th>
                <th>บทบาท</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request, index) => (
                <tr key={request.writer_id}>
                  <td>{index + 1}</td>
                  <td>{request.username}</td>
                  <td>{request.email_writer || request.username}</td>

                  <td>
                    <span className="role-badge role-reader">Reader</span>
                  </td>

                  <td>
                    <span className="status-badge status-pending">
                      {request.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">

                      <button
                        className="btn-edit"
                        onClick={() => handleEditUser(request)}
                      >
                        👁 ดู
                      </button>

                      <button
                        className="btn-approve"
                        onClick={() =>
                          handleActionClick(request.writer_id, request.username, 'approve')
                        }
                      >
                        ✔ ยืนยัน
                      </button>

                      <button
                        className="btn-reject"
                        onClick={() =>
                          handleActionClick(request.writer_id, request.username, 'reject')
                        }
                      >
                        ✖ ปฏิเสธ
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <EditUserModal
          isOpen={editModal.isOpen}
          user={editModal.user}
          onCancel={handleCancelEdit}
        />

        <ActionConfirmModal
          isOpen={actionModal.isOpen}
          title={
            actionModal.action === 'approve'
              ? 'ยืนยันการอนุมัติ'
              : 'ยืนยันการปฏิเสธ'
          }
          message={
            actionModal.action === 'approve'
              ? `คุณต้องการอนุมัติ ${actionModal.userName} ใช่หรือไม่?`
              : `คุณต้องการปฏิเสธ ${actionModal.userName} ใช่หรือไม่?`
          }
          confirmText={
            actionModal.action === 'approve'
              ? 'ยืนยัน'
              : 'ปฏิเสธ'
          }
          confirmClass={
            actionModal.action === 'approve'
              ? 'modal-btn--approve'
              : 'modal-btn--reject'
          }
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      </div>
    </div>
  );
};

export default Manageusers;