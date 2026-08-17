import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useAuth, ROLES, ROLE_LABELS } from '@/features/auth/context';
import { getInitials } from '@/utils/formatters';

// Layout / chrome styles are loaded globally from app/layouts/admin.css.

// Top-level groups matching the spec:
//   Tổng quan | Người dùng & Nhân sự | Danh mục | Kho mỹ phẩm |
//   Hóa đơn & Thanh toán | Báo cáo & Thống kê
// `Danh mục` is a collapsible parent with the 3 child routes.
const navGroups = [
  {
    key: 'overview',
    label: 'Tổng quan',
    items: [
      { path: '/admin', label: 'Bảng điều khiển', icon: 'dashboard', exact: true },
    ],
  },
  {
    key: 'users',
    label: 'Người dùng & Nhân sự',
    items: [
      { path: '/admin/users', label: 'Người dùng & nhân sự', icon: 'users' },
    ],
  },
  {
    key: 'catalog',
    label: 'Danh mục',
    collapsible: true,
    icon: 'folder',
    items: [
      { path: '/admin/catalog/services', label: 'Dịch vụ', icon: 'sparkles' },
      { path: '/admin/catalog/rooms', label: 'Phòng', icon: 'door' },
      { path: '/admin/catalog/cosmetics', label: 'Mỹ phẩm', icon: 'box' },
    ],
  },
  {
    key: 'inventory',
    label: 'Kho mỹ phẩm',
    items: [
      { path: '/admin/inventory', label: 'Kho mỹ phẩm', icon: 'package' },
    ],
  },
  {
    key: 'invoices',
    label: 'Hóa đơn & Thanh toán',
    items: [
      { path: '/admin/invoices', label: 'Hóa đơn & thanh toán', icon: 'fileText' },
    ],
  },
  {
    key: 'reports',
    label: 'Báo cáo & Thống kê',
    items: [
      { path: '/admin/reports', label: 'Báo cáo & thống kê', icon: 'barChart' },
    ],
  },
];

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.7L18.5 9 14 11l-2 9-2-9-4.5-2 4.6-1.3z" />
    </svg>
  ),
  door: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" />
      <circle cx="15" cy="12" r="1" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  barChart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  menu: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  sidebarToggle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  ),
};

function ProfileMenu({ onClose }) {
  const navigate = useNavigate();

  const handleProfile = () => {
    onClose();
    navigate('/admin/profile');
  };

  const handleLogout = () => {
    onClose();
    navigate('/');
  };

  return (
    <div className="admin-profile-menu" role="menu">
      <button type="button" className="admin-profile-menu-item" role="menuitem" onClick={handleProfile}>
        {ICONS.user}
        <span>Hồ sơ quản trị</span>
      </button>
      <div className="admin-profile-menu-divider" />
      <button type="button" className="admin-profile-menu-item admin-profile-menu-item-danger" role="menuitem" onClick={handleLogout}>
        {ICONS.logout}
        <span>Đăng xuất</span>
      </button>
    </div>
  );
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Sidebar states:
  //  - mobile drawer (open/closed via hamburger)
  //  - desktop collapse (icon-only vs full). Persisted to localStorage.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('omamori_admin_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Catalog submenu expanded by default when on a catalog route.
  const [catalogOpen, setCatalogOpen] = useState(() => location.pathname.startsWith('/admin/catalog'));

  // Close mobile drawer on route change (don't trap the user on desktop).
  useEffect(() => {
    setSidebarOpen(false);
    setProfileMenuOpen(false);
    if (location.pathname.startsWith('/admin/catalog')) setCatalogOpen(true);
  }, [location.pathname]);

  // Click outside / Escape to close profile menu.
  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handler = (e) => {
      if (!e.target.closest('.admin-header-profile')) setProfileMenuOpen(false);
    };
    const escape = (e) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escape);
    };
  }, [profileMenuOpen]);

  const persistCollapsed = useCallback((next) => {
    setCollapsed(next);
    try {
      localStorage.setItem('omamori_admin_sidebar_collapsed', String(next));
    } catch (e) {
      /* ignore - storage unavailable */
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isCollapsed = collapsed && !sidebarOpen;

  return (
    <div className={clsx('dashboard-layout', 'admin-layout', isCollapsed && 'admin-layout--collapsed')}>
      <div
        className={clsx('drawer-overlay', sidebarOpen && 'open')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={clsx('dashboard-sidebar', sidebarOpen && 'open')} aria-label="Menu quản trị">
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="16" cy="16" r="14" />
            <path d="M16 8v16M10 14h12M10 18h12" strokeLinecap="round" />
          </svg>
          {!isCollapsed && (
            <>
              <span className="sidebar-logo-text">Omamori</span>
              <span
                className="sidebar-logo-badge"
                style={{ backgroundColor: 'rgba(184, 84, 80, 0.1)', color: 'var(--color-error)' }}
              >
                {ROLE_LABELS[ROLES.ADMIN]}
              </span>
            </>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng quản trị">
          {navGroups.map((group) => {
            // Top-level single item or collapsible parent of catalog.
            const groupActive = group.items.some((it) => isActive(it.path, it.exact));
            if (group.collapsible) {
              return (
                <div key={group.key} className="sidebar-nav-section">
                  <button
                    type="button"
                    className={clsx(
                      'sidebar-nav-group',
                      groupActive && 'sidebar-nav-group--active',
                      isCollapsed && 'sidebar-nav-group--collapsed',
                    )}
                    onClick={() => setCatalogOpen((v) => !v)}
                    aria-expanded={catalogOpen}
                    aria-controls="sidebar-nav-catalog"
                    title={isCollapsed ? group.label : undefined}
                  >
                    <span className="sidebar-nav-group-icon">{ICONS[group.icon] || ICONS.folder}</span>
                    {!isCollapsed && (
                      <>
                        <span className="sidebar-nav-group-label">{group.label}</span>
                        <span className="sidebar-nav-group-chevron">
                          {catalogOpen ? ICONS.chevronDown : ICONS.chevronRight}
                        </span>
                      </>
                    )}
                  </button>
                  {!isCollapsed && catalogOpen && (
                    <div id="sidebar-nav-catalog" className="sidebar-nav-sub">
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={clsx(
                            'sidebar-nav-item sidebar-nav-item--sub',
                            isActive(item.path) && 'active',
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span className="sidebar-nav-item-icon">{ICONS[item.icon]}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {/* Collapsed mode: show sub items as a flyout on hover/active */}
                  {isCollapsed && (
                    <div className="sidebar-nav-sub-flyout">
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={clsx(
                            'sidebar-nav-item sidebar-nav-item--sub',
                            isActive(item.path) && 'active',
                          )}
                          onClick={() => setSidebarOpen(false)}
                          title={item.label}
                        >
                          <span className="sidebar-nav-item-icon">{ICONS[item.icon]}</span>
                          <span className="sidebar-nav-item-label">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={group.key} className="sidebar-nav-section">
                {!isCollapsed && (
                  <div className="sidebar-nav-section-title">{group.label}</div>
                )}
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'sidebar-nav-item',
                      isActive(item.path, item.exact) && 'active',
                    )}
                    onClick={() => setSidebarOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-nav-item-icon">{ICONS[item.icon]}</span>
                    {!isCollapsed && <span className="sidebar-nav-item-label">{item.label}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => persistCollapsed(!collapsed)}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <span
              className={clsx('sidebar-collapse-icon', collapsed && 'sidebar-collapse-icon--collapsed')}
            >
              {ICONS.sidebarToggle}
            </span>
            {!isCollapsed && <span>Thu gọn</span>}
          </button>

          <div className="sidebar-user">
            <div
              className="sidebar-user-avatar"
              style={{ backgroundColor: 'rgba(184, 84, 80, 0.1)', color: 'var(--color-error)' }}
            >
              {getInitials(user?.name) || 'QT'}
            </div>
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || 'Quản trị viên'}</div>
                <div className="sidebar-user-role">{ROLE_LABELS[ROLES.ADMIN]}</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={handleLogout}
              style={{ marginTop: 'var(--space-2)', width: '100%', textAlign: 'left' }}
            >
              {ICONS.logout}
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header admin-header">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            {ICONS.menu}
          </button>

          <div className="admin-header-title">
            <div className="admin-header-eyebrow">Quản trị hệ thống</div>
            <div className="admin-header-greeting">
              {user?.name ? `Xin chào, ${user.name}` : 'Xin chào, Quản trị viên'}
            </div>
          </div>

          <div className="admin-header-profile">
            <button
              type="button"
              className="admin-header-profile-trigger"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Mở menu tài khoản"
            >
              <span
                className="admin-header-profile-avatar"
                style={{ backgroundColor: 'rgba(184, 84, 80, 0.1)', color: 'var(--color-error)' }}
              >
                {getInitials(user?.name) || 'QT'}
              </span>
              <span className="admin-header-profile-meta">
                <span className="admin-header-profile-name">
                  {user?.name || 'Quản trị viên'}
                </span>
                <span className="admin-header-profile-role">
                  {ROLE_LABELS[ROLES.ADMIN]}
                </span>
              </span>
              <span className="admin-header-profile-chevron">
                {ICONS.chevronDown}
              </span>
            </button>
            {profileMenuOpen && (
              <ProfileMenu onClose={() => setProfileMenuOpen(false)} />
            )}
          </div>
        </header>

        <div className="dashboard-content admin-content"><Outlet /></div>
      </div>
    </div>
  );
}

export default AdminLayout;
