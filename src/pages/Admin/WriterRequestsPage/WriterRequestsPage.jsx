import React, { useState, useEffect } from 'react';
import './WriterRequestsPage.css';

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
            <div 
                className="modal-bio" 
                dangerouslySetInnerHTML={{ __html: writerData.bio }} 
            />
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
//  Main Component
// ─────────────────────────────────────────────

const WriterRequestsPage = ({ onNavigate = () => { } }) => {
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

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/admin/writers/requests`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/writers/approve?writer_id=${writerId}`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/writers/reject?writer_id=${writerId}`, {
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

  return (
    <div className="admin-manage-users">
      <div className="admin-container">
        
        {/* Header */}
        <header className="admin-header-sec">
          <div className="admin-header-left">
            <h1 className="admin-title">อนุมัติผู้ขอสมัครนักเขียน</h1>
            <p className="admin-subtitle">
              ตรวจสอบและพิจารณาคำขอสิทธิ์การเขียนนิยายในระบบทางเลือก
            </p>
          </div>
        </header>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="admin-loading">กำลังโหลดคำขอ...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : requests.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-icon">📨</div>
            <h3>ไม่มีคำขอในขณะนี้</h3>
            <p>เมื่อมีผู้อ่านสมัครเป็นนักเขียน คำขอทั้งหมดจะปรากฏที่นี่</p>
          </div>
        ) : (
          /* Table View */
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อผู้ใช้งาน</th>
                  <th>นามปากกา</th>
                  <th>อีเมลที่ใช้สมัคร</th>
                  <th>สถานะ</th>
                  <th className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => (
                  <tr key={req.writer_id}>
                    <td>{index + 1}</td>
                    <td className="user-info-cell">
                      <div className="user-avatar-small">
                        {req.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="username-text">{req.username}</span>
                    </td>
                    <td>{req.pen_name || req.username}</td>
                    <td>{req.email_writer || '-'}</td>
                    <td>
                      <span className="status-badge status-pending">
                        {req.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn action-btn--view"
                        onClick={() => setEditModal({ isOpen: true, user: req })}
                        title="ดูรายละเอียดใบสมัคร"
                      >
                        📄 ดูรายละเอียด
                      </button>

                      <button
                        className="action-btn action-btn--approve"
                        onClick={() => setActionModal({
                          isOpen: true,
                          writerId: req.writer_id,
                          action: 'approve',
                          userName: req.username
                        })}
                        title="อนุมัติเป็นนักเขียน"
                      >
                        ✓ อนุมัติ
                      </button>

                      <button
                        className="action-btn action-btn--reject"
                        onClick={() => setActionModal({
                          isOpen: true,
                          writerId: req.writer_id,
                          action: 'reject',
                          userName: req.username
                        })}
                        title="ปฏิเสธคำขอ"
                      >
                        ✕ ปฏิเสธ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        <EditUserModal
          isOpen={editModal.isOpen}
          user={editModal.user}
          onCancel={() => setEditModal({ isOpen: false, user: null })}
        />

        <ActionConfirmModal
          isOpen={actionModal.isOpen}
          title={actionModal.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
          message={
            actionModal.action === 'approve'
              ? `คุณแน่ใจหรือไม่ว่าต้องการอนุมัติผู้ใช้ "${actionModal.userName}" ให้เป็นนักเขียนในระบบ?`
              : `คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอสมัครของ "${actionModal.userName}"?`
          }
          confirmText={actionModal.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
          confirmClass={actionModal.action === 'approve' ? 'modal-btn--approve' : 'modal-btn--reject'}
          onConfirm={() => {
            if (actionModal.action === 'approve') {
              handleApproveWriter(actionModal.writerId);
            } else {
              handleRejectWriter(actionModal.writerId);
            }
          }}
          onCancel={() => setActionModal({ isOpen: false, writerId: null, action: '', userName: '' })}
        />

      </div>
    </div>
  );
};

export default WriterRequestsPage;
