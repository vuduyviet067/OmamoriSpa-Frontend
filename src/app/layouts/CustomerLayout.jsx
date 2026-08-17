import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import '@/styles/customer.css';
import './customer.css';

const navItems = [
  { path: '/customer', label: 'Tổng quan', icon: 'home' },
  { path: '/customer/appointments', label: 'Lịch hẹn của tôi', icon: 'calendar' },
  { path: '/customer/appointments/new', label: 'Đặt lịch', icon: 'plus' },
  { path: '/customer/transactions', label: 'Lịch sử giao dịch', icon: 'receipt' },
  { path: '/customer/profile', label: 'Thông tin cá nhân', icon: 'user' },
];

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  homeAlt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    const pathname = location.pathname;

    if (path === '/customer') {
      return pathname === '/customer';
    }
    if (path === '/customer/appointments/new') {
      return pathname === '/customer/appointments/new';
    }
    if (path === '/customer/appointments') {
      return pathname === '/customer/appointments' ||
        pathname.startsWith('/customer/appointments/') && !pathname.includes('/new');
    }
    if (path === '/customer/transactions') {
      return pathname === '/customer/transactions';
    }
    if (path === '/customer/profile') {
      return pathname === '/customer/profile';
    }
    return pathname.startsWith(path);
  };

  const getInitials = (name) => {
    if (!name) return 'KH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="customer-layout">
      {/* Mobile backdrop */}
      <div
        className={`customer-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`customer-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Điều hướng khách hàng">
        {/* Brand */}
        <div className="customer-sidebar-brand">
          <div className="customer-sidebar-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="customer-sidebar-brand-text">
            <span className="customer-sidebar-brand-name">OMAMORI SPA</span>
            <span className="customer-sidebar-brand-tag">Khu vực khách hàng</span>
          </div>
        </div>

        {/* Profile mini */}
        <div className="customer-sidebar-profile">
          <div className="customer-sidebar-avatar">
            {user?.avatarUrl || user?.avatar ? (
              <img src={user.avatarUrl || user.avatar} alt={user?.name} />
            ) : (
              getInitials(user?.name)
            )}
          </div>
          <div className="customer-sidebar-profile-info">
            <div className="customer-sidebar-profile-name">{user?.name || 'Khách hàng'}</div>
            <div className="customer-sidebar-profile-role">Khách hàng</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="customer-sidebar-nav" aria-label="Menu chính">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`customer-sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={handleNavClick}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              {icons[item.icon]}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="customer-sidebar-footer">
          <Link to="/" className="customer-sidebar-footer-link">
            {icons.homeAlt}
            Về trang chủ
          </Link>
          <button
            type="button"
            className="customer-sidebar-logout-btn"
            onClick={handleLogout}
          >
            {icons.logout}
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="customer-main">
        {/* Mobile header */}
        <header className="customer-mobile-header">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            {icons.menu}
          </button>
          <div className="customer-mobile-header-brand">
            <div className="customer-mobile-header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>OMAMORI SPA</span>
          </div>
          <div className="customer-mobile-header-greeting">
            Xin chào, {user?.name ? user.name.split(' ').pop() : 'Khách'}
          </div>
        </header>

        {/* Content */}
        <main className="customer-content" id="main-content">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="customer-bottom-nav" aria-label="Điều hướng dưới cùng">
          <div className="customer-bottom-nav-items">
            <Link
              to="/customer"
              className={`customer-bottom-nav-item ${isActive('/customer') ? 'active' : ''}`}
              aria-current={isActive('/customer') ? 'page' : undefined}
            >
              {icons.home}
              <span>Tổng quan</span>
            </Link>
            <Link
              to="/customer/appointments"
              className={`customer-bottom-nav-item ${isActive('/customer/appointments') ? 'active' : ''}`}
              aria-current={isActive('/customer/appointments') ? 'page' : undefined}
            >
              {icons.calendar}
              <span>Lịch hẹn</span>
            </Link>
            <Link
              to="/customer/appointments/new"
              className={`customer-bottom-nav-item ${isActive('/customer/appointments/new') ? 'active' : ''}`}
              aria-current={isActive('/customer/appointments/new') ? 'page' : undefined}
            >
              {icons.plus}
              <span>Đặt lịch</span>
            </Link>
            <Link
              to="/customer/transactions"
              className={`customer-bottom-nav-item ${isActive('/customer/transactions') ? 'active' : ''}`}
              aria-current={isActive('/customer/transactions') ? 'page' : undefined}
            >
              {icons.receipt}
              <span>Giao dịch</span>
            </Link>
            <Link
              to="/customer/profile"
              className={`customer-bottom-nav-item ${isActive('/customer/profile') ? 'active' : ''}`}
              aria-current={isActive('/customer/profile') ? 'page' : undefined}
            >
              {icons.user}
              <span>Tài khoản</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default CustomerLayout;
