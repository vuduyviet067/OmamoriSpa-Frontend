import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';
import {
  getUpcomingAppointments,
  getMyTransactions,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from '@/services/customerService';
import { Button, StatusBadge, LoadingState, ErrorState } from '@/components/common';
import { formatCurrency } from '@/utils/formatters';
import './Dashboard.css';

const SERVICE_IMAGES = {
  'Massage thư giãn': '/images/spa/source/massage.webp',
  'Chăm sóc da mặt': '/images/spa/source/facial.jpg',
  'Liệu pháp đá nóng': '/images/spa/source/hot-stone.webp',
  'Gội đầu dưỡng sinh': '/images/spa/source/head-spa.jpg',
};

const BOOKING_STEPS = [
  { step: 1, label: 'Chọn dịch vụ' },
  { step: 2, label: 'Chọn kỹ thuật viên' },
  { step: 3, label: 'Chọn phòng & thời gian' },
  { step: 4, label: 'Xác nhận' },
];

function CustomerDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appointmentsData, transactionsData] = await Promise.all([
        getUpcomingAppointments(),
        getMyTransactions({ limit: 3 }),
      ]);
      const aptList = Array.isArray(appointmentsData)
        ? appointmentsData
        : (appointmentsData?.data || []);
      const txnList = Array.isArray(transactionsData)
        ? transactionsData
        : (transactionsData?.data || []);
      setAppointments(aptList.slice(0, 3));
      setTransactions(txnList.slice(0, 3));
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return String(timeString).substring(0, 5);
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getServiceImage = (serviceName) => {
    return SERVICE_IMAGES[serviceName] || null;
  };

  const getTransactionCode = (txn) =>
    txn?.invoiceCode || txn?.code || txn?.invoiceNumber || (txn?.id ? `INV-${txn.id}` : '—');

  const getServiceName = (txn) =>
    txn?.serviceName || txn?.appointment?.service?.name || txn?.service?.name || 'Dịch vụ';

  const getTotal = (txn) => {
    if (typeof txn?.totalAmount === 'number') return txn.totalAmount;
    if (typeof txn?.total === 'number') return txn.total;
    return txn?.amount ?? 0;
  };

  const getStatusKey = (txn) => {
    const raw = (txn?.status || '').toString().toUpperCase();
    const STATUS_LABELS = {
      PAID: 'Đã thanh toán',
      PENDING: 'Chờ thanh toán',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền',
      FAILED: 'Thanh toán thất bại',
    };
    return STATUS_LABELS[raw] ? raw : raw || 'PENDING';
  };

  const getStatusVariant = (txn) => {
    const key = getStatusKey(txn);
    if (key === 'PAID') return 'success';
    if (key === 'PENDING') return 'warning';
    if (key === 'CANCELLED') return 'error';
    if (key === 'REFUNDED') return 'info';
    return 'neutral';
  };

  const getStatusLabel = (txn) => {
    const STATUS_LABELS = {
      PAID: 'Đã thanh toán',
      PENDING: 'Chờ thanh toán',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền',
      FAILED: 'Thanh toán thất bại',
    };
    return STATUS_LABELS[getStatusKey(txn)] || getStatusKey(txn);
  };

  if (loading) {
    return <LoadingState message="Đang tải thông tin của bạn..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  const displayName = user?.name || 'Khách hàng';

  return (
    <div className="dash-root">
      {/* Page Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-title">Xin chào, {displayName}</h1>
          <p className="dash-subtitle">Chúc bạn một ngày thư thái tại Omamori Spa.</p>
        </div>
        <div className="dash-header-right">
          <Link to="/customer/appointments/new">
            <Button>Đặt lịch mới</Button>
          </Link>
        </div>
      </div>

      {/* Main grid: appointments + booking steps panel */}
      <div className="dash-grid">
        {/* Left column: upcoming appointments */}
        <div className="dash-main-col">
          <section className="dash-section">
            <h2 className="dash-section-title">Lịch hẹn sắp tới</h2>

            {appointments.length === 0 ? (
              <div className="dash-empty-appointments">
                <div className="dash-empty-inner">
                  <div className="dash-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="dash-empty-text">Bạn chưa có lịch hẹn sắp tới.</p>
                  <Link to="/customer/appointments/new" className="dash-empty-cta">
                    <Button>Đặt lịch mới</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="dash-appointment-list">
                {appointments.map((apt) => {
                  const serviceName = apt.service?.name || apt.serviceName || 'Dịch vụ';
                  const therapistName = apt.therapistName || apt.therapist?.name;
                  const roomName = apt.roomName || apt.room?.name;
                  const statusLabel = APPOINTMENT_STATUS_LABELS[apt.status] || apt.status;
                  const statusVariant = APPOINTMENT_STATUS_VARIANTS[apt.status] || 'neutral';
                  const serviceImage = getServiceImage(serviceName);

                  return (
                    <Link
                      key={apt.id}
                      to={`/customer/appointments/${apt.id}`}
                      className="dash-apt-card"
                    >
                      {serviceImage && (
                        <div className="dash-apt-img">
                          <img src={serviceImage} alt={serviceName} loading="lazy" />
                        </div>
                      )}
                      <div className="dash-apt-body">
                        <div className="dash-apt-row dash-apt-row-top">
                          <div className="dash-apt-service">{serviceName}</div>
                          <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
                        </div>
                        <div className="dash-apt-row">
                          <span className="dash-apt-meta">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatDate(apt.date)} · {formatTime(apt.startTime)}
                          </span>
                        </div>
                        {(therapistName || roomName) && (
                          <div className="dash-apt-row">
                            <span className="dash-apt-meta">
                              {therapistName && (
                                <span className="dash-apt-meta-item">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                  KTV: {therapistName}
                                </span>
                              )}
                              {roomName && (
                                <span className="dash-apt-meta-item">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                  </svg>
                                  {roomName}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Transactions */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Giao dịch gần đây</h2>
              <Link to="/customer/transactions" className="dash-section-link">
                Xem tất cả giao dịch
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="dash-empty-transactions">
                <p>Bạn chưa có giao dịch nào.</p>
              </div>
            ) : (
              <div className="dash-trans-list">
                <div className="dash-trans-header">
                  <span className="dash-trans-col-code">Mã hóa đơn</span>
                  <span className="dash-trans-col-service">Dịch vụ</span>
                  <span className="dash-trans-col-date">Ngày</span>
                  <span className="dash-trans-col-amount">Số tiền</span>
                  <span className="dash-trans-col-status">Trạng thái</span>
                </div>
                {transactions.map((txn) => {
                  const statusKey = getStatusKey(txn);
                  return (
                    <div key={txn.id} className="dash-trans-row">
                      <span className="dash-trans-col-code dash-trans-code">
                        {getTransactionCode(txn)}
                      </span>
                      <span className="dash-trans-col-service dash-trans-service">
                        {getServiceName(txn)}
                      </span>
                      <span className="dash-trans-col-date dash-trans-date">
                        {formatDateTime(txn.paidAt || txn.createdAt || txn.date)}
                      </span>
                      <span className={`dash-trans-col-amount dash-trans-amount ${statusKey === 'PAID' ? 'is-paid' : ''}`}>
                        {formatCurrency(getTotal(txn))}
                      </span>
                      <span className="dash-trans-col-status">
                        <StatusBadge status={getStatusVariant(txn)}>
                          {getStatusLabel(txn)}
                        </StatusBadge>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column: booking steps panel */}
        <aside className="dash-sidebar-col">
          <div className="dash-booking-panel">
            <div className="dash-booking-panel-header">
              <div className="dash-booking-panel-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="dash-booking-panel-title">Đặt lịch trong 4 bước</h3>
            </div>

            <div className="dash-booking-steps">
              {BOOKING_STEPS.map((s, idx) => (
                <div key={s.step} className="dash-booking-step">
                  <div className="dash-booking-step-connector">
                    <div className="dash-booking-step-bullet">{s.step}</div>
                    {idx < BOOKING_STEPS.length - 1 && (
                      <div className="dash-booking-step-line" />
                    )}
                  </div>
                  <span className="dash-booking-step-label">{s.label}</span>
                </div>
              ))}
            </div>

            <Link to="/customer/appointments/new" className="dash-booking-panel-cta">
              <Button style={{ width: '100%' }}>Đặt lịch ngay</Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CustomerDashboard;
