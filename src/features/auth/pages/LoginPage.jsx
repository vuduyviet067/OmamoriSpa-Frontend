import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, REDIRECT_PATHS } from '@/features/auth/context';
import { Button, Input } from '@/components/common';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Email không đúng định dạng';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await login(email.trim().toLowerCase(), password);

      if (rememberMe) {
        localStorage.setItem('omamori_remember', 'true');
      } else {
        localStorage.removeItem('omamori_remember');
      }

      const redirectPath = from || REDIRECT_PATHS[response.user.role] || '/';
      navigate(redirectPath, { replace: true });
    } catch (error) {
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const useMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

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
              Chào mừng bạn quay trở lại. Hãy đăng nhập để tiếp tục trải nghiệm dịch vụ spa cao cấp của chúng tôi.
            </p>
            <div className="auth-visual-features">
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Đặt lịch dễ dàng</span>
              </div>
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Theo dõi lịch sử điều trị</span>
              </div>
              <div className="auth-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Ưu đãi hấp dẫn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h1>Đăng nhập</h1>
              <p>Chào mừng bạn quay trở lại Omamori Spa</p>
            </div>

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
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  error={errors.email}
                  autoComplete="email"
                />

                <Input
                  label="Mật khẩu"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  error={errors.password}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                disabled={isLoading}
                className="auth-submit-btn"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>

            <div className="auth-form-footer">
              <p>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="auth-link">
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            {useMock && (
              <div className="auth-demo-accounts">
                <p className="demo-title">Tài khoản demo để thử nghiệm:</p>
                <div className="demo-accounts">
                  <div className="demo-account">
                    <span className="demo-role">Khách hàng:</span>
                    <code>khachhang</code> / <code>Customer123</code>
                  </div>
                  <div className="demo-account">
                    <span className="demo-role">Kỹ thuật viên:</span>
                    <code>kythuatvien</code> / <code>Therapist123</code>
                  </div>
                  <div className="demo-account">
                    <span className="demo-role">Quản trị viên:</span>
                    <code>quantrivien</code> / <code>Admin123</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
