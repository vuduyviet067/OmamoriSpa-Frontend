import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/common';
import {
  createTherapist,
  updateTherapist,
  extractApiError,
  isDuplicateError,
} from '@/services/adminService';

/**
 * Modal form for adding or editing a therapist.
 *
 * Fields are defensive defaults only - the backend decides which fields are
 * actually required. We surface backend errors (e.g. duplicate personnel)
 * inline rather than swallowing them.
 */
function TherapistForm({
  isOpen,
  mode = 'create',
  initial,
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    specialty: '',
    bio: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        username: initial.username || initial.account?.username || '',
        password: '',
        name: initial.name || initial.fullName || '',
        email: initial.email || '',
        phone: initial.phone || initial.phoneNumber || '',
        specialty: initial.specialty || initial.expertise || '',
        bio: initial.bio || initial.description || '',
      });
    } else {
      setForm({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        specialty: '',
        bio: '',
      });
    }
    setErrors({});
    setGlobalError(null);
  }, [isOpen, initial]);

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = 'Vui lòng nhập họ và tên.';
    if (!isEdit) {
      if (!form.username?.trim()) next.username = 'Vui lòng nhập tên đăng nhập.';
      if (!form.password?.trim() || form.password.length < 6) {
        next.password = 'Mật khẩu tối thiểu 6 ký tự.';
      }
    } else if (form.password && form.password.length > 0 && form.password.length < 6) {
      next.password = 'Mật khẩu tối thiểu 6 ký tự.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Email không đúng định dạng.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        bio: form.bio.trim() || undefined,
      };
      let saved;
      if (isEdit && initial?.id) {
        if (form.username?.trim()) payload.username = form.username.trim();
        if (form.password?.trim()) payload.password = form.password;
        saved = await updateTherapist(initial.id, payload);
      } else {
        payload.username = form.username.trim();
        payload.password = form.password;
        saved = await createTherapist(payload);
      }
      if (onSaved) onSaved(saved);
    } catch (err) {
      // Special-case duplicate personnel
      if (isDuplicateError(err)) {
        setGlobalError('Thông tin nhân sự đã tồn tại trên hệ thống.');
        // Highlight likely conflicting fields
        setErrors((prev) => ({
          ...prev,
          username: ' ',
        }));
      } else {
        setGlobalError(extractApiError(err, 'Không thể lưu thông tin kỹ thuật viên.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Chỉnh sửa kỹ thuật viên' : 'Thêm kỹ thuật viên'}
      size="lg"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm kỹ thuật viên'}
          </Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}

        <div className="admin-form-row">
          <Input
            label="Họ và tên"
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
            placeholder="Nguyễn Văn A"
            required
            autoFocus
          />
          <Input
            label="Số điện thoại"
            type="tel"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="0901 234 567"
            error={errors.phone}
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder="example@omamori.vn"
          error={errors.email}
        />

        <div className="divider" />

        <div className="admin-form-row">
          <Input
            label="Tên đăng nhập"
            value={form.username}
            onChange={handleChange('username')}
            placeholder={isEdit ? '(giữ nguyên nếu không đổi)' : 'kythuatvien.ten'}
            error={errors.username}
            disabled={isEdit}
          />
          <Input
            label={isEdit ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu'}
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            error={errors.password}
            helper={isEdit ? 'Để trống nếu không muốn đổi mật khẩu' : 'Tối thiểu 6 ký tự'}
          />
        </div>

        <div className="divider" />

        <Select
          label="Chuyên môn"
          value={form.specialty}
          onChange={handleChange('specialty')}
          options={[
            { value: 'Massage body', label: 'Massage body' },
            { value: 'Massage foot', label: 'Massage foot' },
            { value: 'Massage đá nóng', label: 'Massage đá nóng' },
            { value: 'Chăm sóc da mặt', label: 'Chăm sóc da mặt' },
            { value: 'Spa trị liệu', label: 'Spa trị liệu' },
          ]}
          placeholder="Chọn chuyên môn"
        />

        <div className="input-group">
          <label htmlFor="therapist-bio" className="input-label">Mô tả / ghi chú</label>
          <textarea
            id="therapist-bio"
            className="admin-textarea"
            value={form.bio}
            onChange={handleChange('bio')}
            placeholder="Mô tả ngắn về kỹ thuật viên (kinh nghiệm, kỹ năng nổi bật...)"
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}

export default TherapistForm;
