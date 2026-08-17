import { Modal, Button, StatusBadge } from '@/components/common';
import { getInitials } from '@/utils/formatters';

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function InfoRow({ label, value }) {
  return (
    <div className="admin-detail-row">
      <span className="admin-detail-label">{label}</span>
      <span className="admin-detail-value">{value || '-'}</span>
    </div>
  );
}

function StatusBlock({ status }) {
  if (!status) return null;
  const variant =
    status === 'active' || status === 'ACTIVE' || status === 'ENABLED'
      ? 'success'
      : status === 'inactive' || status === 'INACTIVE' || status === 'DISABLED'
      ? 'neutral'
      : 'info';
  const label =
    status === 'active' || status === 'ACTIVE'
      ? 'Đang hoạt động'
      : status === 'inactive' || status === 'INACTIVE'
      ? 'Đã vô hiệu hóa'
      : status;
  return (
    <InfoRow
      label="Trạng thái tài khoản"
      value={<StatusBadge status={variant}>{label}</StatusBadge>}
    />
  );
}

function UserDetailModal({ isOpen, onClose, user, role = 'customer' }) {
  if (!user) return null;
  const isTherapist = role === 'therapist';
  const fullName = user.name || user.fullName || 'Không rõ';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isTherapist ? 'Chi tiết kỹ thuật viên' : 'Chi tiết khách hàng'}
      size="md"
      footer={<Button variant="ghost" onClick={onClose}>Đóng</Button>}
    >
      <div className="admin-detail">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border-light)',
          }}
        >
          <span className="admin-avatar admin-avatar-lg">{getInitials(fullName)}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>
              {fullName}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
              {isTherapist ? 'Kỹ thuật viên' : 'Khách hàng'} #{user.id ?? user._id ?? '-'}
            </div>
          </div>
        </div>

        <InfoRow label="Họ và tên" value={fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Số điện thoại" value={user.phone || user.phoneNumber} />
        <InfoRow label="Tên đăng nhập" value={user.username || user.account?.username} />
        <StatusBlock status={user.status || (user.active ? 'active' : 'inactive')} />

        {isTherapist && (
          <>
            <InfoRow
              label="Chuyên môn"
              value={user.specialty || user.expertise}
            />
            {user.bio && <InfoRow label="Giới thiệu" value={user.bio} />}
          </>
        )}

        {!isTherapist && (
          <>
            <InfoRow
              label="Ngày sinh"
              value={user.dob ? formatDate(user.dob) : null}
            />
            <InfoRow
              label="Giới tính"
              value={user.gender}
            />
            <InfoRow
              label="Ngày tham gia"
              value={user.createdAt ? formatDate(user.createdAt) : null}
            />
          </>
        )}

        <InfoRow
          label={isTherapist ? 'Kinh nghiệm (năm)' : 'Tổng lịch hẹn'}
          value={
            isTherapist
              ? user.experienceYears ?? user.yearsOfExperience
              : user.totalAppointments ?? user.appointmentCount
          }
        />
      </div>
    </Modal>
  );
}

export default UserDetailModal;
