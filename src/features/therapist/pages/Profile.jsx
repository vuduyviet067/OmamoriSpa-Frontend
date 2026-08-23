import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/features/auth/context';
import { getMyProfile, updateMyProfile } from '@/services/therapistService';
import { Button, Input, LoadingState } from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

const PHONE_REGEX = /^(0[0-9]{9})$/;

const getInitials = (name) => {
  if (!name) return 'KTV';
  const trimmed = name.trim();
  if (!trimmed) return 'KTV';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
};

function TherapistProfile() {
  const { user, updateUser } = useAuth();
  const flash = useFlashMessage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [original, setOriginal] = useState({
    name: '',
    phone: '',
  });

  const [profileMeta, setProfileMeta] = useState({
    dateOfBirth: null,
    gender: null,
    address: '',
    avatarUrl: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

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
        name: data?.fullName ?? data?.name ?? user?.name ?? '',
        phone: data?.phone ?? user?.phone ?? '',
      };

      setProfileMeta({
        dateOfBirth: data?.dateOfBirth ?? null,
        gender: data?.gender ?? null,
        address: data?.address ?? '',
        avatarUrl: data?.avatarUrl ?? null,
      });

      setOriginal(next);
      setFormData(next);
    } catch (err) {
      console.error('Error fetching therapist profile:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải hồ sơ. Vui lòng thử lại.'
      );
      const fallback = {
        name: user?.name || '',
        phone: user?.phone || '',
      };
      setOriginal(fallback);
      setFormData(fallback);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(
    () => formData.phone !== original.phone,
    [formData.phone, original.phone]
  );

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
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
      if (!profileMeta.dateOfBirth) {
        setError(
          'Hồ sơ hiện chưa có ngày sinh nên chưa thể cập nhật. Vui lòng liên hệ quản trị viên.'
        );
        setSaving(false);
        return;
      }

      const payload = {
        dateOfBirth: profileMeta.dateOfBirth,
        gender: profileMeta.gender,
        phone: formData.phone.replace(/\s/g, ''),
        address: profileMeta.address ?? '',
        avatarUrl: profileMeta.avatarUrl,
      };
      const updated = await updateMyProfile(payload);

      const updatedFields = {
        name: updated?.fullName ?? updated?.name ?? original.name,
        phone: updated?.phone ?? payload.phone,
      };

      setProfileMeta({
        dateOfBirth: updated?.dateOfBirth ?? profileMeta.dateOfBirth,
        gender: updated?.gender ?? profileMeta.gender,
        address: updated?.address ?? profileMeta.address,
        avatarUrl: updated?.avatarUrl ?? profileMeta.avatarUrl,
      });

      setOriginal(updatedFields);
      setFormData(updatedFields);

      if (typeof updateUser === 'function') {
        updateUser({
          phone: updatedFields.phone,
        });
      }

      flash.show('Cập nhật hồ sơ thành công.');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating therapist profile:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải hồ sơ chuyên gia..." />;
  }

  const avatarUrl = user?.avatarUrl || user?.avatar;
  const initials = getInitials(user?.name);
  const roleLabel = ROLE_LABELS[user?.role] || 'Kỹ thuật viên';

  return (
    <div className="therapist-profile-page">
      <Link to="/therapist" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại tổng quan
      </Link>

      <div className="therapist-page-header">
        <h1>Hồ sơ cá nhân</h1>
        <p>Quản lý thông tin tài khoản kỹ thuật viên.</p>
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

      <div className="therapist-profile-card">
        {/* Identity + Avatar */}
        <div className="therapist-profile-identity">
          <div className="therapist-profile-avatar-large">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || 'Avatar'} />
            ) : (
              <span className="therapist-avatar-initials-lg">{initials}</span>
            )}
          </div>
          <div className="therapist-profile-identity-info">
            <div className="therapist-profile-identity-name">{user?.name || 'Kỹ thuật viên'}</div>
            <div className="therapist-profile-identity-row">
              <span className="therapist-profile-identity-label">Tên đăng nhập:</span>
              <span>{user?.username || '—'}</span>
            </div>
            <div className="therapist-profile-identity-row">
              <span className="therapist-profile-identity-label">Vai trò:</span>
              <span>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {!isEditing ? (
          /* VIEW MODE */
          <>
            <div className="therapist-profile-view-grid">
              <div className="therapist-profile-view-row">
                <span className="therapist-profile-view-label">Họ và tên</span>
                <span className="therapist-profile-view-value">{original.name || '—'}</span>
              </div>
              <div className="therapist-profile-view-row">
                <span className="therapist-profile-view-label">Email</span>
                <span className="therapist-profile-view-value">{user?.email || '—'}</span>
              </div>
              <div className="therapist-profile-view-row">
                <span className="therapist-profile-view-label">Số điện thoại</span>
                <span className="therapist-profile-view-value">{original.phone || '—'}</span>
              </div>
            </div>
            <div className="therapist-profile-view-actions">
              <Button onClick={handleEdit}>
                Chỉnh sửa
              </Button>
            </div>
          </>
        ) : (
          /* EDIT MODE */
          <>
            <div className="therapist-profile-form-title">Thông tin có thể chỉnh sửa</div>
            <form onSubmit={handleSubmit} className="profile-form" noValidate>
              <div className="input-group">
                <Input
                  label="Họ và tên"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Nhập họ và tên"
                  disabled
                  readOnly
                />
              </div>
              <div className="input-group">
                <Input
                  label="Email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
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
                />
              </div>
              <div className="profile-form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !isDirty}
                  loading={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default TherapistProfile;
