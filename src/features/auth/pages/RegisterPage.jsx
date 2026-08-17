import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';
import { Button, Input } from '@/components/common';
import './RegisterPage.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
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
    // Vietnamese phone: 10 digits, starting with 0
    const phoneRegex = /^(0[0-9]{9})$/;
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

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ tên';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ tên phải có ít nhất 2 ký tự';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (phải có 10 chữ số, bắt đầu bằng 0)';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự, gồm chữ hoa, chữ thường và số';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
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
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim(),
        password: formData.password,
      });

      setSuccessMessage('Đăng ký thành công! Đang chuyển hướng...');
      
      // Redirect to login after short delay
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            registered: true,
            username: formData.username 
          } 
        });
      }, 1500);
    } catch (error) {
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
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
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Nguyễn Văn A"
                  error={errors.name}
                  autoComplete="name"
                />

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
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="email@example.com"
                  error={errors.email}
                  autoComplete="email"
                />

                <Input
                  label="Tên đăng nhập"
                  type="text"
                  value={formData.username}
                  onChange={handleChange('username')}
                  placeholder="username"
                  error={errors.username}
                  autoComplete="username"
                />

                <div className="input-group">
                  <Input
                    label="Mật khẩu"
                    type="password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    placeholder=" Ít nhất 6 ký tự, có hoa thường và số"
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
