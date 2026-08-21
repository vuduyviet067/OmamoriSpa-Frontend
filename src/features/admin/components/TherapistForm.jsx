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
 * Fields match the backend User creation/update schema:
 *   fullName, email, password (create only), dateOfBirth, gender, phone, address,
 *   specialization, experience
 */
const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  address: '',
  specialization: '',
  experience: '',
};

function TherapistForm({
  isOpen,
  mode = 'create',
  initial = null,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initial) {
      setForm({
        fullName: initial.fullName || '',
        email: initial.email || '',
        password: '',
        dateOfBirth: initial.dateOfBirth || '',
        gender: initial.gender || '',
        phone: initial.phone || '',
        address: initial.address || '',
        specialization: initial.specialization || '',
        experience: initial.experience || '',
      });
    } else {
      setForm(emptyForm);
    }

    setErrors({});
    setGlobalError(null);
  }, [isOpen, mode, initial]);

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};

    if (!form.fullName?.trim()) {
      next.fullName = 'Vui lòng nhập họ và tên.';
    }

    if (!form.email?.trim()) {
      next.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Email không đúng định dạng.';
    }

    if (mode === 'create') {
      if (!form.password) {
        next.password = 'Vui lòng nhập mật khẩu.';
      } else if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$/.test(form.password)) {
        next.password =
          'Mật khẩu tối thiểu 6 ký tự, có chữ hoa, chữ thường và số.';
      }
    }

    if (!form.dateOfBirth) {
      next.dateOfBirth = 'Vui lòng chọn ngày sinh.';
    }

    if (!form.gender) {
      next.gender = 'Vui lòng chọn giới tính.';
    }

    if (!form.phone?.trim()) {
      next.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(form.phone.trim())) {
      next.phone = 'Số điện thoại không đúng định dạng.';
    }

    if (!form.address?.trim()) {
      next.address = 'Vui lòng nhập địa chỉ.';
    }

    if (!form.specialization?.trim()) {
      next.specialization = 'Vui lòng nhập chuyên môn.';
    }

    if (!form.experience?.trim()) {
      next.experience = 'Vui lòng nhập kinh nghiệm.';
    } else if (!/^\d{1,2}$/.test(form.experience.trim())) {
      next.experience = 'Kinh nghiệm phải là số năm từ 0 đến 99.';
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
      if (mode === 'edit') {
        const payload = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phone: form.phone.trim(),
          address: form.address.trim(),
          specialization: form.specialization.trim(),
          experience: form.experience.trim(),
        };

        const saved = await updateTherapist(initial.id, payload);

        if (onSaved) {
          await onSaved(saved);
        }

        return;
      }

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'THERAPIST',
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        phone: form.phone.trim(),
        address: form.address.trim(),
        specialization: form.specialization.trim(),
        experience: form.experience.trim(),
      };

      const saved = await createTherapist(payload);

      if (onSaved) {
        await onSaved(saved);
      }
    } catch (err) {
      if (isDuplicateError(err)) {
        setGlobalError('Thông tin nhân sự đã tồn tại trên hệ thống.');
        setErrors((prev) => ({
          ...prev,
          email: ' ',
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
      title={mode === 'edit' ? 'Sửa kỹ thuật viên' : 'Thêm kỹ thuật viên'}
      size="lg"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {submitting
              ? 'Đang lưu...'
              : mode === 'edit'
                ? 'Lưu thay đổi'
                : 'Thêm kỹ thuật viên'}
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
            value={form.fullName}
            onChange={handleChange('fullName')}
            error={errors.fullName}
            placeholder="Nguyễn Văn A"
            required
            autoFocus
          />

          <Input
            label="Số điện thoại"
            type="tel"
            value={form.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            placeholder="0912345678"
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          placeholder="example@omamori.vn"
          required
        />

        {mode === 'create' && (
          <Input
            label="Mật khẩu"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            helper="Tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số"
            required
          />
        )}

        <div className="admin-form-row">
          <Input
            label="Ngày sinh"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange('dateOfBirth')}
            error={errors.dateOfBirth}
            required
          />

          <Select
            label="Giới tính"
            value={form.gender}
            onChange={handleChange('gender')}
            options={[
              { value: 'MALE', label: 'Nam' },
              { value: 'FEMALE', label: 'Nữ' },
              { value: 'OTHER', label: 'Khác' },
            ]}
            placeholder="Chọn giới tính"
            error={errors.gender}
          />
        </div>

        <Input
          label="Địa chỉ"
          value={form.address}
          onChange={handleChange('address')}
          error={errors.address}
          placeholder="Hà Nội"
          required
        />

        <div className="admin-form-row">
          <Input
            label="Chuyên môn"
            value={form.specialization}
            onChange={handleChange('specialization')}
            error={errors.specialization}
            placeholder="Massage trị liệu"
            required
          />

          <Input
            label="Kinh nghiệm (năm)"
            type="number"
            min="0"
            max="99"
            value={form.experience}
            onChange={handleChange('experience')}
            error={errors.experience}
            placeholder="3"
            required
          />
        </div>
      </form>
    </Modal>
  );
}

export default TherapistForm;
