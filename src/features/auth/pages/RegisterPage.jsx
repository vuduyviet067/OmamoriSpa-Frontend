import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';
import { Button, Input } from '@/components/common';
import './RegisterPage.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Vietnamese phone: 10 digits, starting with 0 or +84
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validatePassword = (password) => {
    return (
      password.length >= 6 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, text: 'Yếu', color: 'var(--color-error)' };
    if (strength <= 3) return { level: 2, text: 'Trung bình', color: 'var(--color-warning)' };
    return { level: 3, text: 'Mạnh', color: 'var(--color-success)' };
  };

  const validate = () => {
    const newErrors = {};

    // fullName validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Mật khẩu tối thiểu 6 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // dateOfBirth validation (must be in the past)
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Vui lòng nhập ngày sinh';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      if (dob >= today) {
        newErrors.dateOfBirth = 'Ngày sinh phải là một ngày trong quá khứ';
      }
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Vui lòng chọn giới tính';
    } else if (!['MALE', 'FEMALE', 'OTHER'].includes(formData.gender)) {
      newErrors.gender = 'Giới tính không hợp lệ';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (0xxxxxxxxx hoặc +84xxxxxxxxx)';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Địa chỉ phải có ít nhất 5 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth, // Format: YYYY-MM-DD
        gender: formData.gender, // MALE | FEMALE | OTHER
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });

      setSuccessMessage('Đăng ký thành công! Đang chuyển hướng...');

      // Redirect to login after short delay
      setTimeout(() => {
        navigate('/login', {
          state: {
            registered: true,
            email: formData.email
          }
        });
      }, 1500);
    } catch (error) {
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.data?.code === 1002) {
        setApiError('Email đã được sử dụng. Vui lòng sử dụng email khác.');
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left side - Visual */}
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="auth-visual-logo">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 8v16M10 14h12M10 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="auth-visual-title">Omamori Spa</h2>
            <p className="auth-visual-subtitle">
              Tham gia cùng chúng tôi để trải nghiệm những dịch vụ spa cao cấp và chăm sóc sức khỏe tốt nhất.
            </p>
            <div className="auth-visual-features">
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Đội ngũ chuyên gia hàng đầu</span>
              </div>
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Phòng trị liệu hiện đại</span>
              </div>
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Ưu đãi dành riêng cho thành viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h1>Tạo tài khoản</h1>
              <p>Đăng ký tài khoản Khách hàng tại Omamori Spa</p>
            </div>

            {successMessage && (
              <div className="auth-success-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {successMessage}
              </div>
            )}

            {apiError && (
              <div className="auth-error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-fields">
                <Input
                  label="Họ và tên"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange('fullName')}
                  placeholder="Nguyễn Văn A"
                  error={errors.fullName}
                  autoComplete="name"
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="email@example.com"
                  error={errors.email}
                  autoComplete="email"
                />

                <div className="input-row">
                  <Input
                    label="Ngày sinh"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange('dateOfBirth')}
                    placeholder="YYYY-MM-DD"
                    error={errors.dateOfBirth}
                  />

                  <div className="input-field">
                    <label className="input-label">Giới tính</label>
                    <select
                      value={formData.gender}
                      onChange={handleChange('gender')}
                      className={`input-select ${errors.gender ? 'input-error' : ''}`}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                    {errors.gender && <span className="input-error-text">{errors.gender}</span>}
                  </div>
                </div>

                <Input
                  label="Số điện thoại"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="0901 234 567"
                  error={errors.phone}
                  autoComplete="tel"
                />

                <Input
                  label="Địa chỉ"
                  type="text"
                  value={formData.address}
                  onChange={handleChange('address')}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  error={errors.address}
                  autoComplete="street-address"
                />

                <div className="input-group">
                  <Input
                    label="Mật khẩu"
                    type="password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    placeholder="Ít nhất 6 ký tự, có hoa thường và số"
                    error={errors.password}
                    autoComplete="new-password"
                  />
                  {formData.password && (
                    <div className="password-strength">
                      <div className="password-strength-bar">
                        <div
                          className="password-strength-fill"
                          style={{
                            width: `${(passwordStrength.level / 3) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        />
                      </div>
                      <span className="password-strength-text" style={{ color: passwordStrength.color }}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                  <div className="password-requirements">
                    <p className="password-requirements-title">Mật khẩu phải có:</p>
                    <ul>
                      <li className={formData.password.length >= 6 ? 'met' : ''}>
                        {formData.password.length >= 6 ? '✓' : '•'} Ít nhất 6 ký tự
                      </li>
                      <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                        {/[A-Z]/.test(formData.password) ? '✓' : '•'} Ít nhất 1 chữ hoa
                      </li>
                      <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                        {/[a-z]/.test(formData.password) ? '✓' : '•'} Ít nhất 1 chữ thường
                      </li>
                      <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                        {/[0-9]/.test(formData.password) ? '✓' : '•'} Ít nhất 1 chữ số
                      </li>
                    </ul>
                  </div>
                </div>

                <Input
                  label="Xác nhận mật khẩu"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="Nhập lại mật khẩu"
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                disabled={isLoading || successMessage}
                className="auth-submit-btn"
              >
                {isLoading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
              </Button>
            </form>

            <div className="auth-form-footer">
              <p>
                Đã có tài khoản?{' '}
                <Link to="/login" className="auth-link">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
