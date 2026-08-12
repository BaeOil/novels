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
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return {};
  const s = raw.trim();
  if (!s) return {};
  if (s.startsWith('{') || s.startsWith('[')) {
    try { return JSON.parse(s); } catch (_) {}
  }
  return { contact_required: s, primary_contact: s };
};

// ป้ายกำกับภาษาไทยสำหรับ key ที่พบบ่อย ถ้าไม่รู้จัก key ไหนก็ใช้ชื่อ key เดิมแทน
const CONTACT_KEY_LABELS = {
  primary_contact: 'ช่องทางหลัก',
  secondary_contact: 'ช่องทางรอง',
  contact_required: 'ช่องทางหลัก',
  contact_optional: 'ช่องทางรอง',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  website: 'เว็บไซต์',
  line: 'Line',
  discord: 'Discord',
  instagram: 'Instagram',
};

const contactKeyLabel = (key) => CONTACT_KEY_LABELS[key] || key;
const getInitial = (name) => {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
};

// แสดงรูปโปรไฟล์จริงถ้า backend ส่ง url มาให้ (เผื่อไว้สำหรับตอนที่ backend เพิ่ม field นี้)
// ถ้าไม่มี url หรือโหลดรูปไม่สำเร็จ จะ fallback กลับไปเป็นวงกลมตัวอักษรย่อเหมือนเดิมทุกอย่าง
const UserAvatar = ({ src, name, className }) => {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={displayName(name)}
        className={className}
        onError={() => setBroken(true)}
      />
    );
  }
  return <div className={className}>{getInitial(name)}</div>;
};

const displayName = (name) => name || 'ไม่ทราบชื่อผู้ใช้';

// ─────────────────────────────────────────────
//  โมดัลยืนยันการอนุมัติ / ปฏิเสธ
// ─────────────────────────────────────────────
const ActionConfirmModal = ({ isOpen, action, userName, reason, onReasonChange, busy, error, onConfirm, onCancel }) => {
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

        {!isApprove && (
          <div className="wr-confirm-body" style={{ paddingTop: 0 }}>
            <label className="wr-modal__info-label" htmlFor="rejection-reason" style={{ display: 'block', marginBottom: 6 }}>
              เหตุผลที่ปฏิเสธ (ไม่บังคับ แต่แนะนำให้ระบุ เพื่อให้ผู้สมัครรู้ว่าต้องแก้อะไร)
            </label>
            <textarea
              id="rejection-reason"
              className="wr-search-input"
              style={{ width: '100%', borderRadius: 10, minHeight: 72, resize: 'vertical', padding: 10 }}
              placeholder="เช่น ข้อมูลไม่ครบถ้วน, แนะนำตัวไม่ชัดเจน, ..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

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
  // แสดงทุก key ที่มีค่าจริงใน contact_info แทนการเดาชื่อ key เจาะจง
  // เพราะข้อมูลเก่าในระบบใช้ชื่อ key ไม่ตรงกันเลย (primary_contact, contact_required, twitter, ...)
  const contactEntries = Object.entries(contactInfo || {}).filter(
    ([key, value]) => key !== 'genres' && value !== null && value !== undefined && String(value).trim() !== ''
  );
  const writerData = {
    fullName: user.name_lastname || 'ไม่ระบุ',
    penName: user.pen_name || displayName(user.username),
    email: user.email_writer || displayName(user.username),
    bio: stripHtml(user.bio) || 'ผู้สมัครยังไม่ได้กรอกข้อมูลแนะนำตัว',
    genres: user.genres || contactInfo.genres || [],
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
          {user.previous_attempt_count > 0 && (
            <div className="wr-reapply-notice">
              <AlertTriangle size={16} />
              <div>
                <div className="wr-reapply-notice__title">
                  สมัครซ้ำครั้งที่ {user.previous_attempt_count + 1} — เคยถูกปฏิเสธมาก่อน
                </div>
                {user.previous_rejection_reason && (
                  <div className="wr-reapply-notice__reason">
                    เหตุผลรอบก่อน: {user.previous_rejection_reason}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="wr-modal__profile-row">
            <UserAvatar
              src={user.avatar_url || user.pic_profile}
              name={user.username}
              className="wr-modal__avatar"
            />
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
            <div className="wr-modal__section-title">ช่องทางติดต่อ</div>
            {contactEntries.length > 0 ? (
              contactEntries.map(([key, value]) => (
                <div className="wr-modal__info-row" key={key}>
                  <span className="wr-modal__info-label">{contactKeyLabel(key)}</span>
                  <span className="wr-modal__info-value">
                    {String(value).startsWith('http') ? (
                      <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))
            ) : (
              <div className="wr-modal__empty-note">ผู้สมัครยังไม่ได้ระบุช่องทางติดต่อ</div>
            )}
          </div>

          {!isPending && (
            <div>
              <div className="wr-modal__section-title">ประวัติการตัดสินใจ</div>
              <div className="wr-modal__info-row">
                <span className="wr-modal__info-label">
                  {user.status === 'approved' ? 'อนุมัติเมื่อ' : 'ปฏิเสธเมื่อ'}
                </span>
                <span className="wr-modal__info-value">
                  {(() => {
                    const at = user.status === 'approved' ? user.approved_at : user.rejected_at;
                    return at ? new Date(at).toLocaleString('th-TH') : 'ไม่มีข้อมูล (คำขอเก่าก่อนระบบเก็บ log)';
                  })()}
                </span>
              </div>
              <div className="wr-modal__info-row">
                <span className="wr-modal__info-label">ดำเนินการโดย</span>
                <span className="wr-modal__info-value">
                  {user.acted_by_admin_username || (user.acted_by_admin_id ? `แอดมิน ID: ${user.acted_by_admin_id}` : 'ไม่มีข้อมูล')}
                </span>
              </div>
              {user.status === 'rejected' && (
                <div className="wr-modal__info-row">
                  <span className="wr-modal__info-label">เหตุผลที่ปฏิเสธ</span>
                  <span className="wr-modal__info-value">{stripHtml(user.rejection_reason) || 'ไม่ได้ระบุเหตุผล'}</span>
                </div>
              )}
            </div>
          )}

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // รองรับทั้ง response แบบเก่า (array ตรงๆ) และแบบใหม่ ({data, total, counts})
  // เผื่อ backend ยังทำ pagination จริงไม่เสร็จ จะได้ไม่พังระหว่างนี้
  const [serverPaginated, setServerPaginated] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  const [detailModal, setDetailModal] = useState({ isOpen: false, user: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    writerId: null,
    action: '',
    userName: '',
    reason: '',
    busy: false,
    error: '',
  });

  // 🎯 ดึง "จำนวนรวมทุกสถานะ" แยกต่างหาก ไม่ผูกกับ filterTab ที่กำลังดูอยู่
  // จาก network response จริงที่เห็น: backend คืนค่าเป็น array ตรงๆ เสมอ ไม่เคยมี field `counts`
  // แนบมาด้วยเลย ฉะนั้นวิธีที่แม่นยำและไม่ต้องเดาโครงสร้าง backend คือ ขอข้อมูลแบบไม่กรอง status
  // มาทั้งหมดครั้งเดียว แล้วนับเองฝั่ง client ตรงๆ จากลิสต์จริงที่ได้มา
  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('limit', '1000'); // ขอมาทั้งหมดเพื่อนับเองให้ครบทุกสถานะ ไม่พึ่ง field counts ที่ backend ไม่ได้ส่งมา

      const res = await fetch(`${API_BASE_URL}/api/admin/writers/requests?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);

      // รองรับทั้งกรณี backend คืน array ตรงๆ (ตามที่เห็นจริง) และกรณีในอนาคตที่อาจห่อเป็น {data:[...]}
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      setCounts({
        pending: list.filter((r) => !r.status || r.status === 'pending').length,
        approved: list.filter((r) => r.status === 'approved').length,
        rejected: list.filter((r) => r.status === 'rejected').length,
      });
    } catch (err) {
      console.warn('Failed to load writer request counts:', err);
    }
  };

  const fetchRequests = async (page = currentPage, attempt = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const term = searchTerm.trim();
      const params = new URLSearchParams();

      // ถ้ากำลังค้นหาอยู่ ยังไม่มี search param ฝั่ง backend รองรับ
      // เลยขอมาเยอะๆ ครั้งเดียวแล้วกรอง/แบ่งหน้าเองฝั่ง client แทน (ยอมรับ trade-off นี้ไปก่อน)
      if (term) {
        params.set('limit', '1000');
      } else {
        if (filterTab !== 'all') params.set('status', filterTab);
        params.set('page', String(page));
        params.set('limit', String(itemsPerPage));
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/writers/requests?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('ไม่สามารถดึงคำขอได้');
      const data = await res.json().catch(() => null);

      if (data === null || data === undefined) {
        // 🩹 backend คืนค่า "null" ตรงๆ ตอนลิสต์ที่กรองอยู่ว่างเปล่า (เช่น ไม่มีคำขอ pending เลย)
        // ค่านี้หมายถึง "รายการที่กำลังดูอยู่ว่าง" เท่านั้น ไม่ได้แปลว่านับรวมทุกสถานะเป็น 0
        // จึงรีเซ็ตแค่ requests/total ของ "มุมมองปัจจุบัน" แต่ไม่แตะ counts รวม (ให้ fetchCounts ดูแลแยก)
        //
        // สำคัญ: serverPaginated ต้องคำนวณแบบเดียวกับ branch ปกติ (!term) ห้าม hardcode เป็น false
        // เพราะถ้า false การ์ดสถิติ (pendingCount/approvedCount/rejectedCount) จะสลับไปคำนวณจาก
        // requests.filter(...) ซึ่งตอนนี้เป็น [] แทนที่จะใช้ counts ที่ถูกต้อง — นี่คือสาเหตุที่พอกด
        // tab ที่ว่างเปล่า การ์ดอื่นๆ ก็เห็นเป็น 0 ไปด้วยทั้งที่ fetchCounts ตั้งค่าไว้ถูกต้องแล้ว
        setRequests([]);
        setTotalCount(0);
        setServerPaginated(!term);
      } else if (Array.isArray(data)) {
        // Backend เวอร์ชันเก่า (ยังไม่ทำ pagination จริง) — ใช้วิธีเดิม โหลดหมดมากรอง/แบ่งหน้าเอง
        setRequests(data);
        setServerPaginated(false);
      } else {
        setRequests(data.data || []);
        setTotalCount(data.total || 0);
        // หมายเหตุ: ไม่ setCounts จากตรงนี้ เพราะ response นี้ถูกกรองด้วย status filter ของ tab ปัจจุบัน
        // ถ้า backend คำนวณ counts จาก query ที่กรองแล้ว จะได้ตัวเลขที่ไม่ใช่ยอดรวมจริงของสถานะอื่น
        // (เช่น ดู tab "ปฏิเสธ" แล้ว counts.approved กลายเป็น 0) ตัวเลขบนการ์ดสถิติจึงใช้ fetchCounts()
        // ซึ่งยิงแบบไม่กรอง status เป็นแหล่งความจริงเดียวแทน
        // ตอนค้นหาอยู่ ถือว่าไม่ใช่ server-paginated แล้ว (เพราะขอข้อมูลมาเยอะๆ ครั้งเดียว)
        setServerPaginated(!term);
      }
      setIsLoading(false);
    } catch (err) {
      console.error(`Failed to load writer requests (attempt ${attempt + 1}):`, err);

      // 🩹 บั๊กที่เจอ: ตอนเพิ่งเข้าหน้านี้ครั้งแรก บางทีคำขอแรกจะพลาดแบบชั่วคราว
      // (เช่น token ใน localStorage ยังตั้งไม่เสร็จ / เครือข่ายสะดุดจังหวะแรก)
      // แล้วหน้าก็ค้างอยู่ที่ error เดิมพร้อมตัวเลข 0 ไปตลอด จนกว่าจะมีอะไรมาสั่ง fetch ใหม่เอง
      // (เช่นกดการ์ดสถิติ) ซึ่งพอลองใหม่มันก็ผ่านปกติ — ของจริงไม่ได้หายไปไหน แค่ไม่มีการลองซ้ำอัตโนมัติ
      // จึงเพิ่ม retry อัตโนมัติสั้นๆ ก่อน ค่อย fallback เป็นข้อความ error ให้ผู้ใช้กดลองเองทีหลัง
      if (attempt < 2) {
        setTimeout(() => fetchRequests(page, attempt + 1), 700 * (attempt + 1));
        return;
      }

      setError('ไม่สามารถโหลดคำขอสมัครนักเขียนได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTab, currentPage, searchTerm]);

  // ดึง counts รวมครั้งเดียวตอนเข้าเพจ ไม่ต้องรันซ้ำตอนสลับ tab (fetchRequests ที่มี counts มาด้วยจะช่วยอัปเดตให้เองอยู่แล้ว)
  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (writerId, action, reason) => {
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
        body: action === 'reject' ? JSON.stringify({ rejection_reason: reason || '' }) : undefined,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || (action === 'approve' ? 'ไม่สามารถอนุมัติคำขอได้' : 'ไม่สามารถปฏิเสธคำขอได้'));
      }
      setConfirmModal({ isOpen: false, writerId: null, action: '', userName: '', reason: '', busy: false, error: '' });
      setDetailModal({ isOpen: false, user: null });
      await fetchRequests();
      await fetchCounts();
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
      reason: '',
      busy: false,
      error: '',
    });
  };

  // การ์ดสถิติใช้ counts ที่ fetchCounts คำนวณจากลิสต์เต็มเสมอ (ไม่ขึ้นกับ tab/หน้าที่กำลังดูอยู่)
  // ไม่สลับไปนับจาก requests อีกต่อไป เพราะ requests คือแค่ข้อมูลของ "หน้าที่กำลังดู" เท่านั้น
  const pendingCount = counts.pending;
  const approvedCount = counts.approved;
  const rejectedCount = counts.rejected;

  const filteredRequests = useMemo(() => {
    // server-paginated แล้ว: requests ที่ได้มาคือหน้าปัจจุบันที่ backend กรอง/ตัดมาให้แล้ว ใช้ตรงๆ ได้เลย
    if (serverPaginated) return requests;

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
  }, [requests, filterTab, searchTerm, serverPaginated]);

  const changeFilterTab = (key) => {
    setFilterTab(key);
    setCurrentPage(1);
  };

  const changeSearchTerm = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const totalPages = serverPaginated
    ? Math.max(1, Math.ceil(totalCount / itemsPerPage))
    : Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));

  const paginatedRequests = useMemo(() => {
    // server-paginated แล้ว: ไม่ต้องตัดซ้ำฝั่ง client อีก backend ตัดมาให้แล้ว
    if (serverPaginated) return filteredRequests;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, serverPaginated]);

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
            <button
              type="button"
              className="wr-page-error-retry"
              onClick={() => fetchRequests(currentPage)}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* การ์ดสรุปสถิติ — กดเพื่อกรองตารางตามสถานะนั้นได้เลย */}
        <div className="wr-stats-grid">
          <button
            type="button"
            className={`wr-stat-card wr-stat-card--pending ${filterTab === 'pending' ? 'wr-stat-card--active' : ''}`}
            onClick={() => changeFilterTab('pending')}
            aria-pressed={filterTab === 'pending'}
          >
            <div className="wr-stat-card-icon"><Clock size={20} /></div>
            <div>
              <div className="wr-stat-label">รอตรวจสอบ</div>
              <div className="wr-stat-value">{pendingCount.toLocaleString()}</div>
            </div>
          </button>
          <button
            type="button"
            className={`wr-stat-card wr-stat-card--approved ${filterTab === 'approved' ? 'wr-stat-card--active' : ''}`}
            onClick={() => changeFilterTab('approved')}
            aria-pressed={filterTab === 'approved'}
          >
            <div className="wr-stat-card-icon"><ShieldCheck size={20} /></div>
            <div>
              <div className="wr-stat-label">อนุมัติแล้ว</div>
              <div className="wr-stat-value">{approvedCount.toLocaleString()}</div>
            </div>
          </button>
          <button
            type="button"
            className={`wr-stat-card wr-stat-card--rejected ${filterTab === 'rejected' ? 'wr-stat-card--active' : ''}`}
            onClick={() => changeFilterTab('rejected')}
            aria-pressed={filterTab === 'rejected'}
          >
            <div className="wr-stat-card-icon"><X size={20} /></div>
            <div>
              <div className="wr-stat-label">ปฏิเสธแล้ว</div>
              <div className="wr-stat-value">{rejectedCount.toLocaleString()}</div>
            </div>
          </button>
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
                onClick={() => changeFilterTab(tab.key)}
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
              onChange={(e) => changeSearchTerm(e.target.value)}
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
                  <th>ลำดับ</th>
                  <th>ผู้สมัคร</th>
                  <th>นามปากกา</th>
                  <th>อีเมลที่ใช้สมัคร</th>
                  <th>สถานะ</th>
                  <th className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req, index) => {
                  const statusInfo = STATUS_INFO[req.status] || STATUS_INFO.pending;
                  const isPending = !req.status || req.status === 'pending';
                  return (
                    <tr key={req.writer_id}>
                      <td className="wr-row-num">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>
                        <div className="wr-user-info-cell">
                          <UserAvatar
                            src={req.pic_profile || req.avatar_url}
                            name={req.username}
                            className="wr-user-avatar-small"
                          />
                          <span className="wr-username-text">{displayName(req.username)}</span>
                          {req.previous_attempt_count > 0 && (
                            <span className="wr-reapply-badge" title="เคยยื่นสมัครมาก่อนหน้านี้">
                              สมัครครั้งที่ {req.previous_attempt_count + 1}
                            </span>
                          )}
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
          {!isLoading && totalPages > 1 && (
            <div className="wr-pagination">
              <button
                type="button"
                className="wr-page-nav"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                &larr; ก่อนหน้า
              </button>
              <div className="wr-page-nums">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    className={`wr-page-num ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="wr-page-nav"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                ถัดไป &rarr;
              </button>
            </div>
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
          reason={confirmModal.reason}
          onReasonChange={(value) => setConfirmModal((prev) => ({ ...prev, reason: value }))}
          busy={confirmModal.busy}
          error={confirmModal.error}
          onConfirm={() => runAction(confirmModal.writerId, confirmModal.action, confirmModal.reason)}
          onCancel={() =>
            !confirmModal.busy &&
            setConfirmModal({ isOpen: false, writerId: null, action: '', userName: '', reason: '', busy: false, error: '' })
          }
        />
      </div>
    </div>
  );
};

export default WriterRequestsPage;