import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';
import { Button } from '@/components/common';
import './styles.css';

function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleBookNow = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { path: '/', label: 'Trang chủ' },
    { path: '/services', label: 'Dịch vụ' },
    { path: '/cosmetics', label: 'Mỹ phẩm' },
    { path: '/therapists', label: 'Đội ngũ KTV' },
  ];

  return (
    <div className="public-layout">
      <header className="public-header">
        <nav className="public-nav">
          <Link to="/" className="public-logo" aria-label="Omamori Spa - Trang chủ">
            <span className="public-logo-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.25" />
                <path
                  d="M16 9c2.5 2 2.5 12 0 14M11 14h10"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="public-logo-text">OMAMORI SPA</span>
          </Link>

          <div className="public-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`public-nav-link ${isActive(link.path) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="public-nav-actions">
            {isAuthenticated ? (
              <>
                <span className="nav-user-greeting">
                  Xin chào, {user?.name?.split(' ').pop() || user?.username}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="public-nav-login">
                  Đăng nhập
                </Link>
                <Link to="/register">
                  <Button variant="ghost" size="sm">Đăng ký</Button>
                </Link>
              </>
            )}
            <Button variant="primary" size="sm" onClick={handleBookNow}>
              Đặt lịch
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div className={`drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <Link to="/" className="public-logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="public-logo-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.25" />
                <path
                  d="M16 9c2.5 2 2.5 12 0 14M11 14h10"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="public-logo-text">OMAMORI SPA</span>
          </Link>
          <button
            className="mobile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="mobile-drawer-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mobile-drawer-actions">
          {isAuthenticated ? (
            <>
              <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
                Xin chào, {user?.name}
              </div>
              <Button variant="secondary" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-action-link" onClick={() => setMobileMenuOpen(false)}>
                Đăng nhập
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Đăng ký
                </Button>
              </Link>
            </>
          )}
          <Button variant="primary" onClick={handleBookNow} style={{ width: '100%', justifyContent: 'center' }}>
            Đặt lịch
          </Button>
        </div>
      </div>

      <main className="public-main">
  <Outlet />
</main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-grid">
            {/* Column 1: Brand */}
            <div className="public-footer-col public-footer-brand">
              <Link to="/" className="public-footer-brand-mark" aria-label="Omamori Spa - Trang chủ">
                <span className="public-footer-logo-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.25" />
                    <path
                      d="M16 9c2.5 2 2.5 12 0 14M11 14h10"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="public-footer-logo-text">OMAMORI SPA</span>
              </Link>
              <p className="public-footer-tagline">
                Chăm sóc bằng sự tinh tế,
                <br />
                phục hồi bằng sự tận tâm.
              </p>
            </div>

            {/* Column 2: Liên kết */}
            <div className="public-footer-col">
              <h4 className="public-footer-heading">Liên kết</h4>
              <ul className="public-footer-list">
                <li><Link to="/">Trang chủ</Link></li>
                <li><Link to="/services">Dịch vụ</Link></li>
                <li><Link to="/cosmetics">Mỹ phẩm</Link></li>
                <li><Link to="/therapists">Đội ngũ KTV</Link></li>
              </ul>
            </div>

            {/* Column 3: Thông tin (no real routes — static text only) */}
            <div className="public-footer-col">
              <h4 className="public-footer-heading">Thông tin</h4>
              <ul className="public-footer-list">
                <li><span>Về Omamori</span></li>
                <li><span>Chính sách bảo mật</span></li>
                <li><span>Điều khoản sử dụng</span></li>
              </ul>
            </div>

            {/* Column 4: Liên hệ */}
            <div className="public-footer-col">
              <h4 className="public-footer-heading">Liên hệ</h4>
              <ul className="public-footer-contact">
                <li className="public-footer-contact-item">
                  <span className="public-footer-contact-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span>Hotline: 0901 234 567</span>
                </li>
                <li className="public-footer-contact-item">
                  <span className="public-footer-contact-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span>contact@omamorispa.com</span>
                </li>
                <li className="public-footer-contact-item public-footer-contact-hours">
                  <span className="public-footer-contact-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span className="public-footer-hours">
                    <span>Thứ 2 - Thứ 6: 9:00 - 21:00</span>
                    <span>Thứ 7 - Chủ nhật: 9:00 - 22:00</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="public-footer-bottom">
            <p>© {new Date().getFullYear()} Omamori Spa. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
