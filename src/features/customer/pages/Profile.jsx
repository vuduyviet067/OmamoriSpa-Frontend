import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/features/auth/context';
import { getMyProfile, updateMyProfile } from '@/services/customerService';
import { Input, LoadingState } from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0[0-9]{9})$/;

const getInitials = (name) => {
  if (!name) return 'KH';
  const trimmed = name.trim();
  if (!trimmed) return 'KH';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
};

function CustomerProfile() {
  const { user, updateUser } = useAuth();
  const flash = useFlashMessage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [original, setOriginal] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const fetchedRef = useRef(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProfile();
      const next = {
        name: data?.name ?? user?.name ?? '',
        email: data?.email ?? user?.email ?? '',
        phone: data?.phone ?? user?.phone ?? '',
      };
      setOriginal(next);
      setFormData(next);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải thông tin cá nhân. Vui lòng thử lại.',
      );
      const fallback = {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      };
      setOriginal(fallback);
      setFormData(fallback);
    } finally {
      setLoading(false);
      fetchedRef.current = true;
    }
  };

  const isDirty = useMemo(() => (
    formData.name !== original.name
    || formData.email !== original.email
    || formData.phone !== original.phone
  ), [formData, original]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Email không đúng định dạng';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!PHONE_REGEX.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    setFormData(original);
    setErrors({});
    setError(null);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    if (!isDirty) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\s/g, ''),
      };
      const updated = await updateMyProfile(payload);

      // Backend may return either the user object directly or a wrapped payload.
      const updatedFields = {
        name: updated?.name ?? payload.name,
        email: updated?.email ?? payload.email,
        phone: updated?.phone ?? payload.phone,
      };
      setOriginal(updatedFields);
      setFormData(updatedFields);

      // Sync auth state so the header/sidebar reflects the new name.
      if (typeof updateUser === 'function') {
        updateUser(updatedFields);
      }

      flash.show('Cập nhật thông tin cá nhân thành công.');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể cập nhật thông tin. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải thông tin của bạn..." />;
  }

  const avatarUrl = user?.avatarUrl || user?.avatar;
  const roleLabel = ROLE_LABELS[user?.role] || 'Khách hàng';

  return (
    <div>
      <Link to="/customer" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại trang chủ
      </Link>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Thông tin cá nhân
        </h1>
        <p style={{ color: 'var(--color-charcoal-muted)', marginBottom: 0 }}>
          Quản lý thông tin tài khoản của bạn
        </p>
      </div>

      {error && (
        <div className="booking-alert booking-alert-error" role="alert">
          {error}
        </div>
      )}

      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      {/* Read-only identity card */}
      <div className="customer-card profile-identity">
        <div className="profile-identity-avatar" aria-hidden="true">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name || 'Avatar'} />
          ) : (
            <span>{getInitials(user?.name)}</span>
          )}
        </div>
        <div className="profile-identity-info">
          <div className="profile-identity-name">{user?.name || 'Khách hàng'}</div>
          <div className="profile-identity-row">
            <span className="profile-identity-label">Tên đăng nhập:</span>
            <span className="profile-identity-value">{user?.username || '—'}</span>
          </div>
          <div className="profile-identity-row">
            <span className="profile-identity-label">Vai trò:</span>
            <span className="profile-identity-value">{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Profile form - view/edit mode */}
      <div className="customer-card">
        <div className="customer-card-title-row">
          <div className="customer-card-title">Thông tin cá nhân</div>
          {!isEditing ? (
            <button
              type="button"
              className="profile-edit-btn"
              onClick={handleEdit}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Chỉnh sửa
            </button>
          ) : (
            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-edit-action-btn cancel"
                onClick={handleCancel}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="profile-edit-action-btn save"
                onClick={handleSubmit}
                disabled={saving || !isDirty}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </div>
        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <Input
              label="Họ và tên"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Nhập họ và tên của bạn"
              error={errors.name}
              autoComplete="name"
              disabled={!isEditing}
            />
          </div>

          <div className="input-group">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="email@example.com"
              error={errors.email}
              autoComplete="email"
              disabled={!isEditing}
            />
          </div>

          <div className="input-group">
            <Input
              label="Số điện thoại"
              type="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="0901 234 567"
              error={errors.phone}
              autoComplete="tel"
              disabled={!isEditing}
            />
          </div>

          <div className="input-group">
            <Input
              label="Tên đăng nhập"
              value={user?.username || '—'}
              disabled
              readOnly
            />
          </div>

          <div className="input-group">
            <Input
              label="Vai trò"
              value={roleLabel}
              disabled
              readOnly
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerProfile;