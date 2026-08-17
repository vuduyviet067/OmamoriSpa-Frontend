import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
} from '@/components/common';
import { getDashboardOverview, extractApiError } from '@/services/adminService';

const ICONS = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.7L18.5 9 14 11l-2 9-2-9-4.5-2 4.6-1.3z" />
    </svg>
  ),
  door: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" />
      <circle cx="15" cy="12" r="1" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    </svg>
  ),
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

function StatCard({ label, value, hint, icon, variant, to }) {
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`admin-stat-card${variant ? ` admin-stat-card--${variant}` : ''}`}
    >
      <div className="admin-stat-card-head">
        <span className="admin-stat-label">{label}</span>
        <span className="admin-stat-icon">{icon}</span>
      </div>
      <span className="admin-stat-value">{value}</span>
      {hint && <span className="admin-stat-hint">{hint}</span>}
    </Wrapper>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardOverview();
      setData(result || {});
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải dữ liệu tổng quan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Bảng điều khiển" description="Tổng quan vận hành spa Omamori" />
        <LoadingState message="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Bảng điều khiển" description="Tổng quan vận hành spa Omamori" />
        <ErrorState title="Không tải được dữ liệu" message={error} onRetry={load} />
      </div>
    );
  }

  const todayAppointments = data?.todayAppointments ?? 0;
  const pendingInvoices = data?.pendingInvoices ?? 0;
  const lowStockItems = data?.lowStockItems ?? 0;
  const totalCustomers = data?.totalCustomers ?? 0;
  const todayAppointmentsList = data?.todayAppointmentsList || [];
  const lowStockList = data?.lowStockList || [];

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển"
        description="Tổng quan vận hành spa Omamori - hôm nay"
      />

      {/* Overview stat grid */}
      <div className="admin-stat-grid">
        <StatCard
          label="Lịch hẹn hôm nay"
          value={todayAppointments}
          hint={todayAppointmentsList.length > 0 ? 'Xem chi tiết bên dưới' : 'Chưa có lịch hẹn'}
          icon={ICONS.calendar}
          to="/admin/invoices"
        />
        <StatCard
          label="Hóa đơn chờ thanh toán"
          value={pendingInvoices}
          hint={pendingInvoices > 0 ? 'Cần xử lý' : 'Đã xử lý hết'}
          icon={ICONS.fileText}
          variant="warning"
          to="/admin/invoices"
        />
        <StatCard
          label="Mỹ phẩm sắp hết"
          value={lowStockItems}
          hint={lowStockItems > 0 ? 'Cần nhập kho' : 'Tồn kho ổn định'}
          icon={ICONS.alert}
          variant={lowStockItems > 0 ? 'warning' : undefined}
          to="/admin/inventory"
        />
        <StatCard
          label="Khách hàng"
          value={totalCustomers}
          hint="Khách hàng đã đăng ký"
          icon={ICONS.users}
          to="/admin/users"
        />
      </div>

      {/* Today appointments overview */}
      <div className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-title">Lịch hẹn hôm nay</h3>
          <Link to="/admin/invoices" className="customer-section-link">
            Xem tất cả
          </Link>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {todayAppointmentsList.length === 0 ? (
              <EmptyState
                title="Chưa có lịch hẹn hôm nay"
                description="Hôm nay chưa có lịch hẹn nào được đặt."
              />
            ) : (
              <div className="admin-list" style={{ padding: '0 var(--space-6)' }}>
                {todayAppointmentsList.slice(0, 6).map((apt) => (
                  <div className="admin-list-row" key={apt.id ?? apt._id}>
                    <div className="admin-list-row-main">
                      <div className="admin-list-row-title">
                        {apt.serviceName || apt.service?.name || 'Dịch vụ'}
                      </div>
                      <div className="admin-list-row-meta">
                        {apt.customerName || apt.customer?.name || 'Khách hàng'} -{' '}
                        {apt.therapistName || apt.therapist?.name || 'KTV'}
                        {apt.roomName ? ` - ${apt.roomName}` : ''}
                      </div>
                    </div>
                    <div className="admin-list-row-meta">
                      {formatDateTime(apt.startTime || apt.time || apt.date)}
                      {apt.status && (
                        <span style={{ marginLeft: 'var(--space-3)' }}>
                          <StatusBadge status={apt.statusVariant || 'info'}>
                            {apt.statusLabel || apt.status}
                          </StatusBadge>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock list */}
      <div className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-title">Mỹ phẩm sắp hết</h3>
          <Link to="/admin/inventory" className="customer-section-link">
            Quản lý kho
          </Link>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {lowStockList.length === 0 ? (
              <EmptyState
                title="Kho ổn định"
                description="Không có mỹ phẩm nào sắp hết hàng."
              />
            ) : (
              <div className="admin-list" style={{ padding: '0 var(--space-6)' }}>
                {lowStockList.slice(0, 6).map((item) => (
                  <div className="admin-list-row" key={item.id ?? item._id}>
                    <div className="admin-list-row-main">
                      <div className="admin-list-row-title">
                        {item.name || 'Sản phẩm'}
                      </div>
                      <div className="admin-list-row-meta">
                        {item.brand || item.manufacturer || 'Không rõ thương hiệu'}
                      </div>
                    </div>
                    <div className="admin-list-row-meta">
                      Tồn: <strong>{item.stock ?? '-'}</strong>
                      {item.minStock !== undefined && ` / tối thiểu ${item.minStock}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-title">Lối tắt quản lý</h3>
        </div>
        <div className="admin-quicklinks">
          <Link to="/admin/users" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.users}</span>
            <span className="admin-quicklink-text">Người dùng & nhân sự</span>
          </Link>
          <Link to="/admin/catalog/services" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.sparkles}</span>
            <span className="admin-quicklink-text">Danh mục dịch vụ</span>
          </Link>
          <Link to="/admin/catalog/rooms" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.door}</span>
            <span className="admin-quicklink-text">Danh mục phòng</span>
          </Link>
          <Link to="/admin/catalog/cosmetics" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.box}</span>
            <span className="admin-quicklink-text">Danh mục mỹ phẩm</span>
          </Link>
          <Link to="/admin/inventory" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.package}</span>
            <span className="admin-quicklink-text">Kho mỹ phẩm</span>
          </Link>
          <Link to="/admin/invoices" className="admin-quicklink">
            <span className="admin-quicklink-icon">{ICONS.fileText}</span>
            <span className="admin-quicklink-text">Hóa đơn & thanh toán</span>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
        <Button variant="ghost" onClick={load}>Tải lại</Button>
      </div>
    </div>
  );
}

export default AdminDashboard;
