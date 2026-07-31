import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  User,
  Mail,
  Check,
  FileText,
  Loader2,
  AlertTriangle,
  Inbox,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import './WriterRequestsPage.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// ป้ายกำกับแท็บกรอง
const FILTER_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอตรวจสอบ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ปฏิเสธแล้ว' },
];

// ข้อความ + คลาส badge ตามสถานะจริงของคำขอ (เดิมโค้ดเก่า hardcode เป็น "pending" เสมอ)
const STATUS_INFO = {
  pending: { label: 'รอตรวจสอบ', className: 'wr-badge-pending' },
  approved: { label: 'อนุมัติแล้ว', className: 'wr-badge-approved' },
  rejected: { label: 'ปฏิเสธแล้ว', className: 'wr-badge-rejected' },
};

const EMPTY_MESSAGE = {
  all: 'ยังไม่มีคำขอสมัครนักเขียนในระบบ',
  pending: 'ไม่มีคำขอที่รอตรวจสอบในตอนนี้',
  approved: 'ไม่มีคำขอที่อนุมัติแล้ว',
  rejected: 'ไม่มีคำขอที่ถูกปฏิเสธ',
};

// ⚠️ Safety-net: bio ที่กรอกผ่านฟอร์ม rich-text อาจมี HTML/สคริปต์ติดมาได้
// เดิมหน้านี้ใช้ dangerouslySetInnerHTML แสดง bio ตรง ๆ ซึ่งเสี่ยง XSS
// จึงตัด tag ออกก่อนแสดงผลเสมอ เหมือนที่ทำในหน้ารายงาน
const stripHtml = (text) => {
  if (!text) return text;
  return text.replace(/<[^>]*>/g, '').trim();
};

const parseContactInfo = (raw) => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
};

// กัน crash เวลา username เป็น null/undefined/ว่างเปล่า จาก backend
const getInitial = (name) => {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};

const displayName = (name) => name || 'ไม่ทราบชื่อผู้ใช้';

// ─────────────────────────────────────────────
//  โมดัลยืนยันการอนุมัติ / ปฏิเสธ
// ─────────────────────────────────────────────
const ActionConfirmModal = ({ isOpen, action, userName, busy, error, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const isApprove = action === 'approve';

  return (
    <div className="wr-modal-overlay" onClick={() => !busy && onCancel()}>
      <div className="wr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wr-modal__header">
          <div>
            <div className="wr-modal__eyebrow">ยืนยันการดำเนินการ</div>
            <div className="wr-modal__heading">
              {isApprove ? 'ยืนยันการอนุมัติเป็นนักเขียน' : 'ยืนยันการปฏิเสธคำขอ'}
            </div>
          </div>
          <button className="wr-modal__close" onClick={onCancel} disabled={busy} aria-label="ปิดหน้าต่าง">
            <X size={16} />
          </button>
        </div>

        <div className="wr-confirm-body">
          {isApprove ? (
            <>คุณแน่ใจหรือไม่ว่าต้องการอนุมัติ <strong>"{userName}"</strong> ให้เป็นนักเขียนในระบบ ผู้ใช้จะได้รับสิทธิ์เขียนนิยายทันที</>
          ) : (
            <>คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอสมัครของ <strong>"{userName}"</strong> การดำเนินการนี้ไม่สามารถย้อนกลับได้</>
          )}
        </div>

        <div className="wr-modal__body">
          {error && (
            <div className="wr-modal__error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="wr-modal__actions">
            <button
              className="wr-modal__action-btn wr-btn-action--reject"
              onClick={onCancel}
              disabled={busy}
            >
              ยกเลิก
            </button>
            <button
              className={`wr-modal__action-btn ${isApprove ? 'wr-btn-action--approve' : 'wr-btn-action--reject'}`}
              style={!isApprove ? { background: '#dc2626', color: '#fff' } : undefined}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="spin" /> : isApprove ? <Check size={14} /> : <X size={14} />}
              {isApprove ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  โมดัลดูรายละเอียดใบสมัคร
// ─────────────────────────────────────────────
const RequestDetailModal = ({ isOpen, user, onCancel, onApprove, onReject }) => {
  if (!isOpen || !user) return null;

  const contactInfo = parseContactInfo(user.contact_info);
  const writerData = {
    fullName: user.name_lastname || 'ไม่ระบุ',
    penName: user.pen_name || displayName(user.username),
    email: user.email_writer || displayName(user.username),
    bio: stripHtml(user.bio) || 'ผู้สมัครยังไม่ได้กรอกข้อมูลแนะนำตัว',
    genres: contactInfo.genres || [],
    mainContact: contactInfo.primary_contact || '',
  };

  const statusInfo = STATUS_INFO[user.status] || STATUS_INFO.pending;
  const isPending = user.status === 'pending' || !user.status;

  return (
    <div className="wr-modal-overlay" onClick={onCancel}>
      <div className="wr-modal wr-modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="wr-modal__header">
          <div>
            <div className="wr-modal__eyebrow">ใบสมัครนักเขียน · {displayName(user.username)}</div>
            <div className="wr-modal__heading">รายละเอียดคำขอ</div>
          </div>
          <button className="wr-modal__close" onClick={onCancel} aria-label="ปิดหน้าต่าง">
            <X size={16} />
          </button>
        </div>

        <div className="wr-modal__body">
          <div className="wr-modal__profile-row">
            <div className="wr-modal__avatar">{getInitial(user.username)}</div>
            <div>
              <div className="wr-modal__profile-name">{writerData.penName}</div>
              <div className="wr-modal__profile-sub">ชื่อผู้ใช้: {displayName(user.username)}</div>
            </div>
            <span className={`wr-status-badge ${statusInfo.className}`} style={{ marginLeft: 'auto' }}>
              {statusInfo.label}
            </span>
          </div>

          <div>
            <div className="wr-modal__section-title">ข้อมูลนักเขียน</div>
            <div className="wr-modal__info-row">
              <span className="wr-modal__info-label">ชื่อ - นามสกุล</span>
              <span className="wr-modal__info-value">{writerData.fullName}</span>
            </div>
            <div className="wr-modal__info-row">
              <span className="wr-modal__info-label">นามปากกา</span>
              <span className="wr-modal__info-value">{writerData.penName}</span>
            </div>
            <div className="wr-modal__info-row">
              <span className="wr-modal__info-label">อีเมลที่ใช้สมัคร</span>
              <span className="wr-modal__info-value">{writerData.email}</span>
            </div>
          </div>

          <div>
            <div className="wr-modal__section-title">แนะนำตัว</div>
            <div className="wr-modal__bio">{writerData.bio}</div>
          </div>

          <div>
            <div className="wr-modal__section-title">ประเภทนิยายที่สนใจเขียน</div>
            {writerData.genres.length > 0 ? (
              <div className="wr-modal__genres">
                {writerData.genres.map((genre, idx) => (
                  <span key={idx} className="wr-modal__genre-tag">{genre}</span>
                ))}
              </div>
            ) : (
              <div className="wr-modal__empty-note">ผู้สมัครยังไม่ได้ระบุประเภทนิยาย</div>
            )}
          </div>

          <div>
            <div className="wr-modal__section-title">ช่องทางติดต่อหลัก</div>
            {writerData.mainContact ? (
              <div className="wr-modal__info-row">
                <span className="wr-modal__info-label">ลิงก์ติดต่อ</span>
                <span className="wr-modal__info-value">
                  <a href={writerData.mainContact} target="_blank" rel="noopener noreferrer">
                    {writerData.mainContact}
                  </a>
                </span>
              </div>
            ) : (
              <div className="wr-modal__empty-note">ผู้สมัครยังไม่ได้ระบุช่องทางติดต่อ</div>
            )}
          </div>

          {isPending ? (
            <div className="wr-modal__actions">
              <button
                className="wr-modal__action-btn wr-btn-action--reject"
                onClick={() => onReject(user)}
              >
                <X size={14} /> ปฏิเสธคำขอ
              </button>
              <button
                className="wr-modal__action-btn wr-btn-action--approve"
                onClick={() => onApprove(user)}
              >
                <Check size={14} /> อนุมัติเป็นนักเขียน
              </button>
            </div>
          ) : (
            <div className="wr-modal__empty-note">คำขอนี้ถูกตรวจสอบและตัดสินใจไปแล้ว</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────

const WriterRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterTab, setFilterTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const [detailModal, setDetailModal] = useState({ isOpen: false, user: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    writerId: null,
    action: '',
    userName: '',
    busy: false,
    error: '',
  });

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/writers/requests`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('ไม่สามารถดึงคำขอได้');
      const data = await res.json();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load writer requests:', err);
      setError('ไม่สามารถโหลดคำขอสมัครนักเขียนได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const runAction = async (writerId, action) => {
    setConfirmModal((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      const res = await fetch(`${API_BASE_URL}/api/admin/writers/${endpoint}?writer_id=${writerId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || (action === 'approve' ? 'ไม่สามารถอนุมัติคำขอได้' : 'ไม่สามารถปฏิเสธคำขอได้'));
      }
      setConfirmModal({ isOpen: false, writerId: null, action: '', userName: '', busy: false, error: '' });
      setDetailModal({ isOpen: false, user: null });
      await fetchRequests();
    } catch (err) {
      console.error(`${action} writer failed:`, err);
      setConfirmModal((prev) => ({
        ...prev,
        busy: false,
        error: err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      }));
    }
  };

  const openConfirm = (user, action) => {
    setDetailModal({ isOpen: false, user: null });
    setConfirmModal({
      isOpen: true,
      writerId: user.writer_id,
      action,
      userName: user.pen_name || displayName(user.username),
      busy: false,
      error: '',
    });
  };

  const pendingCount = requests.filter((r) => !r.status || r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (filterTab === 'pending') list = list.filter((r) => !r.status || r.status === 'pending');
    else if (filterTab === 'approved') list = list.filter((r) => r.status === 'approved');
    else if (filterTab === 'rejected') list = list.filter((r) => r.status === 'rejected');

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((r) =>
        (r.username || '').toLowerCase().includes(term) ||
        (r.pen_name || '').toLowerCase().includes(term) ||
        (r.email_writer || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [requests, filterTab, searchTerm]);

  return (
    <div className="wr-container">
      <div className="wr-content">
        <div className="wr-header">
          <h1 className="wr-title">อนุมัติผู้ขอสมัครนักเขียน</h1>
          <p className="wr-subtitle">ตรวจสอบและพิจารณาคำขอสิทธิ์การเขียนนิยายในระบบ</p>
          <svg className="wr-header-branch-accent" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 8 H70 M70 8 C 78 8, 78 2, 86 2 H130 M70 8 C 78 8, 78 14, 86 14 H130 M130 2 H200 M130 14 H160" />
          </svg>
        </div>

        {error && (
          <div className="wr-page-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* การ์ดสรุปสถิติ */}
        <div className="wr-stats-grid">
          <div className="wr-stat-card wr-stat-card--pending">
            <div className="wr-stat-card-icon"><Clock size={20} /></div>
            <div>
              <div className="wr-stat-label">รอตรวจสอบ</div>
              <div className="wr-stat-value">{pendingCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="wr-stat-card wr-stat-card--approved">
            <div className="wr-stat-card-icon"><ShieldCheck size={20} /></div>
            <div>
              <div className="wr-stat-label">อนุมัติแล้ว</div>
              <div className="wr-stat-value">{approvedCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="wr-stat-card wr-stat-card--rejected">
            <div className="wr-stat-card-icon"><X size={20} /></div>
            <div>
              <div className="wr-stat-label">ปฏิเสธแล้ว</div>
              <div className="wr-stat-value">{rejectedCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* แท็บกรอง + ค้นหา */}
        <div className="wr-toolbar">
          <div className="wr-filter-tabs" role="tablist" aria-label="กรองรายการตามสถานะ">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filterTab === tab.key}
                className={`wr-filter-tab-btn ${filterTab === tab.key ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="wr-search-box">
            <Search size={15} />
            <input
              type="text"
              className="wr-search-input"
              placeholder="ค้นหาชื่อผู้ใช้ นามปากกา หรืออีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ตารางรายการ */}
        <div className="wr-table-card">
          {isLoading ? (
            <div className="wr-table-loading">
              <Loader2 size={20} className="spin" />
              <span>กำลังโหลดคำขอ...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="wr-table-empty">
              <Inbox size={26} />
              <strong>{searchTerm ? 'ไม่พบผลลัพธ์ที่ตรงกับการค้นหา' : 'ไม่มีคำขอ'}</strong>
              <span>{searchTerm ? `ลองค้นหาด้วยคำอื่น หรือล้างช่องค้นหา` : EMPTY_MESSAGE[filterTab]}</span>
            </div>
          ) : (
            <table className="wr-table">
              <thead>
                <tr>
                  <th>ผู้สมัคร</th>
                  <th>นามปากกา</th>
                  <th>อีเมลที่ใช้สมัคร</th>
                  <th>สถานะ</th>
                  <th className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_INFO[req.status] || STATUS_INFO.pending;
                  const isPending = !req.status || req.status === 'pending';
                  return (
                    <tr key={req.writer_id}>
                      <td>
                        <div className="wr-user-info-cell">
                          <div className="wr-user-avatar-small">
                            {getInitial(req.username)}
                          </div>
                          <span className="wr-username-text">{displayName(req.username)}</span>
                        </div>
                      </td>
                      <td>{req.pen_name || <span className="wr-subtext">ไม่ระบุ</span>}</td>
                      <td>
                        {req.email_writer ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={13} color="#94a3b8" /> {req.email_writer}
                          </span>
                        ) : (
                          <span className="wr-subtext">ไม่ระบุ</span>
                        )}
                      </td>
                      <td>
                        <span className={`wr-status-badge ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <div className="wr-btn-group">
                          <button
                            className="wr-btn-action wr-btn-action--view"
                            onClick={() => setDetailModal({ isOpen: true, user: req })}
                            title="ดูรายละเอียดใบสมัคร"
                          >
                            <FileText size={13} /> ดูรายละเอียด
                          </button>

                          {isPending && (
                            <>
                              <button
                                className="wr-btn-action wr-btn-action--approve"
                                onClick={() => openConfirm(req, 'approve')}
                                title="อนุมัติเป็นนักเขียน"
                              >
                                <Check size={13} /> อนุมัติ
                              </button>

                              <button
                                className="wr-btn-action wr-btn-action--reject"
                                onClick={() => openConfirm(req, 'reject')}
                                title="ปฏิเสธคำขอ"
                              >
                                <X size={13} /> ปฏิเสธ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modals */}
        <RequestDetailModal
          isOpen={detailModal.isOpen}
          user={detailModal.user}
          onCancel={() => setDetailModal({ isOpen: false, user: null })}
          onApprove={(user) => openConfirm(user, 'approve')}
          onReject={(user) => openConfirm(user, 'reject')}
        />

        <ActionConfirmModal
          isOpen={confirmModal.isOpen}
          action={confirmModal.action}
          userName={confirmModal.userName}
          busy={confirmModal.busy}
          error={confirmModal.error}
          onConfirm={() => runAction(confirmModal.writerId, confirmModal.action)}
          onCancel={() =>
            !confirmModal.busy &&
            setConfirmModal({ isOpen: false, writerId: null, action: '', userName: '', busy: false, error: '' })
          }
        />
      </div>
    </div>
  );
};

export default WriterRequestsPage;