import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, ROLES, ROLE_LABELS } from '@/features/auth/context';
import './styles.css';

const getInitials = (name) => {
  if (!name) return 'KTV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

function TherapistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/therapist') {
      return location.pathname === '/therapist';
    }
    if (path === '/therapist/schedule') {
      return location.pathname === '/therapist/schedule'
        || location.pathname.startsWith('/therapist/appointments')
        || location.pathname.startsWith('/therapist/treatments');
    }
    return location.pathname.startsWith(path);
  };

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const avatarUrl = user?.avatar || user?.avatarUrl || null;
  const initials = getInitials(user?.name);

  return (
    <div className="therapist-layout">
      <div
        className={`therapist-drawer-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`therapist-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Omamori Branding */}
        <div className="therapist-sidebar-brand">
          <svg className="therapist-omamori-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M16 8v16M10 11h12M10 21h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className="therapist-brand-text">
            <span className="therapist-brand-name">OMAMORI SPA</span>
            <span className="therapist-brand-tagline">Khu vực kỹ thuật viên</span>
          </div>
        </div>

        {/* Therapist Profile */}
        <div className="therapist-sidebar-profile">
          <div className="therapist-profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || 'Avatar'} className="therapist-avatar-img" />
            ) : (
              <div className="therapist-avatar-initials">{initials}</div>
            )}
          </div>
          <div className="therapist-profile-info">
            <div className="therapist-profile-name">{user?.name || 'Kỹ thuật viên'}</div>
            <div className="therapist-profile-role">{ROLE_LABELS[ROLES.THERAPIST]}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="therapist-sidebar-nav">
          <div className="therapist-nav-section">
            <span className="therapist-nav-section-label">Ca làm việc</span>
            <Link
              to="/therapist"
              className={`therapist-nav-item ${isActive('/therapist') && location.pathname === '/therapist' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>Tổng quan</span>
            </Link>
            <Link
              to="/therapist/schedule"
              className={`therapist-nav-item ${isActive('/therapist/schedule') ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Lịch làm việc</span>
            </Link>
          </div>

          <div className="therapist-nav-section">
            <span className="therapist-nav-section-label">Tài khoản</span>
            <Link
              to="/therapist/profile"
              className={`therapist-nav-item ${isActive('/therapist/profile') ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Hồ sơ cá nhân</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="therapist-sidebar-footer">
          <button className="therapist-nav-item therapist-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="therapist-workspace">
        {/* Workspace Header - simplified, no duplicate greeting */}
        <header className="therapist-workspace-header">
          <button
            className="therapist-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="therapist-workspace-title">
            <span className="therapist-workspace-date">{todayLabel}</span>
          </div>
        </header>

        <main className="therapist-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default TherapistLayout;
