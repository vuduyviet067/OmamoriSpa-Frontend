import { useEffect, useState } from 'react';
import {
  PageHeader,
  Button,
  Input,
  StatusBadge,
} from '@/components/common';
import { useAuth } from '@/features/auth/context';
import { getInitials } from '@/utils/formatters';
import useFlashMessage from '@/hooks/useFlashMessage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)[3-9][0-9]{8}$/;

const validateProfile = (form) => {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = 'Vui lòng nhập họ và tên.';
  else if (form.name.trim().length > 80) errors.name = 'Họ và tên tối đa 80 ký tự.';

  if (!form.email || !form.email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Email chưa hợp lệ.';

  if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, ''))) {
    errors.phone = 'Số điện thoại chưa hợp lệ (VD: 0901234567).';
  }
  return errors;
};

const validatePassword = (form) => {
  const errors = {};
  if (!form.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
  if (!form.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
  else if (form.newPassword.length < 8) errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  if (!form.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới.';
  else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  return errors;
};

function AdminProfile() {
  const { user, updateUser } = useAuth();
  const flash = useFlashMessage(3500);

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileChange = (field) => (e) => {
    const v = e.target.value;
    setProfileForm((prev) => ({ ...prev, [field]: v }));
    setProfileDirty(true);
    setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const trimmed = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: (profileForm.phone || '').replace(/\s/g, '').trim(),
    };
    const errors = validateProfile(trimmed);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProfileSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      updateUser(trimmed);
      setProfileForm(trimmed);
      setProfileDirty(false);
      flash.show({ type: 'success', text: 'Đã cập nhật thông tin cá nhân.' });
    } catch (err) {
      flash.show({
        type: 'error',
        text: 'Không thể lưu thông tin. Vui lòng thử lại.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileCancel = () => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    setProfileErrors({});
    setProfileDirty(false);
  };

  const handlePasswordChange = (field) => (e) => {
    const v = e.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: v }));
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePassword(passwordForm);
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPasswordSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash.show({ type: 'success', text: 'Đã cập nhật mật khẩu.' });
    } catch (err) {
      flash.show({
        type: 'error',
        text: 'Không thể đổi mật khẩu. Vui lòng thử lại.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Hồ sơ quản trị" description="Quản lý thông tin tài khoản quản trị" />

      {flash.message && (
        <div
          className={`admin-banner admin-banner--${flash.message.type}`}
          role={flash.message.type === 'error' ? 'alert' : 'status'}
        >
          <span>{flash.message.text}</span>
        </div>
      )}

      <div className="admin-profile-grid">
        <div className="card" style={{ maxWidth: '720px' }}>
          <div className="card-body">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Thông tin tài khoản</h4>
            <form onSubmit={handleProfileSubmit} noValidate>
              <div className="admin-form">
                <Input
                  label="Họ và tên"
                  required
                  value={profileForm.name}
                  onChange={handleProfileChange('name')}
                  error={profileErrors.name}
                  autoComplete="name"
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={handleProfileChange('email')}
                  error={profileErrors.email}
                  autoComplete="email"
                />
                <Input
                  label="Số điện thoại"
                  type="tel"
                  value={profileForm.phone}
                  onChange={handleProfileChange('phone')}
                  error={profileErrors.phone}
                  placeholder="VD: 0901234567"
                  autoComplete="tel"
                />
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleProfileCancel}
                    disabled={profileSaving || !profileDirty}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" loading={profileSaving} disabled={!profileDirty}>
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="card admin-profile-side">
          <div className="card-body">
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Tài khoản</h4>
            <div className="admin-profile-avatar">
              <span aria-hidden="true">{getInitials(user?.name) || 'QT'}</span>
            </div>
            <div className="admin-profile-meta">
              <div className="admin-profile-name">{user?.name || 'Quản trị viên'}</div>
              <div className="admin-profile-role">{user?.role || 'Quản trị'}</div>
            </div>
            <ul className="admin-profile-list">
              <li>
                <span>Email</span>
                <strong>{user?.email || '—'}</strong>
              </li>
              <li>
                <span>Số điện thoại</span>
                <strong>{user?.phone || '—'}</strong>
              </li>
              <li>
                <span>Trạng thái</span>
                <StatusBadge variant="success">Đang hoạt động</StatusBadge>
              </li>
            </ul>
          </div>
        </div>

        <div className="card" style={{ maxWidth: '720px' }}>
          <div className="card-body">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Đổi mật khẩu</h4>
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="admin-form">
                <Input
                  label="Mật khẩu hiện tại"
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange('currentPassword')}
                  error={passwordErrors.currentPassword}
                  autoComplete="current-password"
                />
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange('newPassword')}
                  error={passwordErrors.newPassword}
                  helper="Ít nhất 8 ký tự."
                  autoComplete="new-password"
                />
                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange('confirmPassword')}
                  error={passwordErrors.confirmPassword}
                  autoComplete="new-password"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" loading={passwordSaving}>
                    Cập nhật mật khẩu
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;
