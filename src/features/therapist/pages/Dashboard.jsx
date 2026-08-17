import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';
import {
  getMySchedule,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  toISODate,
} from '@/services/therapistService';
import {
  Button,
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

const formatTime = (timeString) => {
  if (!timeString) return '';
  return String(timeString).substring(0, 5);
};

const formatDateLong = (iso) => {
  if (!iso) return '';
  const datePart = iso.length > 10 ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
};

const parseStart = (apt) => {
  if (!apt?.date) return null;
  const datePart = apt.date.length > 10 ? apt.date.split('T')[0] : apt.date;
  const startTime = (apt.startTime || '00:00').substring(0, 5);
  const start = new Date(`${datePart}T${startTime}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
};

const getCustomerName = (apt) =>
  apt.customerName || apt.customer?.name || apt.customer?.fullName || 'Khách hàng';

const getServiceName = (apt) =>
  apt.service?.name || apt.serviceName || 'Dịch vụ';

const getRoomName = (apt) =>
  apt.roomName || apt.room?.name || '—';

function TherapistDashboard() {
  const { user } = useAuth();
  const flash = useFlashMessage();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMySchedule();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching therapist schedule:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải lịch trình. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const today = toISODate(new Date());

  const todays = useMemo(() => {
    return appointments
      .filter((apt) => toISODate(apt.date) === today)
      .filter((apt) => apt.status !== APPOINTMENT_STATUS.CANCELLED)
      .sort((a, b) => {
        const ta = formatTime(a.startTime);
        const tb = formatTime(b.startTime);
        return ta.localeCompare(tb);
      });
  }, [appointments, today]);

  const summary = useMemo(() => {
    let total = 0;
    let upcoming = 0;
    let completed = 0;
    const now = Date.now();

    todays.forEach((apt) => {
      total += 1;
      const start = parseStart(apt);
      if (apt.status === APPOINTMENT_STATUS.COMPLETED) {
        completed += 1;
        return;
      }
      if (!start || start.getTime() >= now) {
        upcoming += 1;
      }
    });

    return { total, upcoming, completed };
  }, [todays]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const candidates = todays
      .filter((apt) => apt.status !== APPOINTMENT_STATUS.COMPLETED)
      .map((apt) => ({ apt, start: parseStart(apt) }))
      .filter(({ apt, start }) => {
        if (apt.status === APPOINTMENT_STATUS.IN_TREATMENT) return true;
        return start && start.getTime() >= now;
      })
      .sort((a, b) => {
        const ta = a.start ? a.start.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.start ? b.start.getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });

    return candidates[0]?.apt || null;
  }, [todays]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }), []);

  if (loading) {
    return <LoadingState message="Đang tải lịch trình hôm nay..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchSchedule} />;
  }

  return (
    <div className="therapist-dashboard">
      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      <section className="therapist-greeting" aria-label="Lời chào">
        <h1>Xin chào, {user?.name || 'Kỹ thuật viên'}</h1>
        <p className="therapist-greeting-date">{todayLabel}</p>
        <p className="therapist-greeting-sub">
          Lịch làm việc của bạn hôm nay.
        </p>
      </section>

      {/* Lightweight summary - intentionally omits revenue */}
      <section className="therapist-summary" aria-label="Tổng quan ca hôm nay">
        <div className="therapist-summary-card">
          <div className="therapist-summary-value">{summary.total}</div>
          <div className="therapist-summary-label">Tổng ca hôm nay</div>
        </div>
        <div className="therapist-summary-card therapist-summary-card-info">
          <div className="therapist-summary-value">{summary.upcoming}</div>
          <div className="therapist-summary-label">Sắp tới</div>
        </div>
        <div className="therapist-summary-card therapist-summary-card-success">
          <div className="therapist-summary-value">{summary.completed}</div>
          <div className="therapist-summary-label">Đã hoàn thành</div>
        </div>
      </section>

      {/* Next session highlight */}
      {nextAppointment && (
        <section className="customer-card therapist-next-card" aria-label="Ca tiếp theo">
          <div className="therapist-next-header">
            <span className="therapist-next-eyebrow">Ca tiếp theo</span>
            <StatusBadge status={APPOINTMENT_STATUS_VARIANTS[nextAppointment.status]}>
              {APPOINTMENT_STATUS_LABELS[nextAppointment.status] || nextAppointment.status}
            </StatusBadge>
          </div>
          <div className="therapist-next-body">
            <div className="therapist-next-service">{getServiceName(nextAppointment)}</div>
            <div className="therapist-next-meta">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {formatTime(nextAppointment.startTime)}
                {nextAppointment.endTime && ` - ${formatTime(nextAppointment.endTime)}`}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {getCustomerName(nextAppointment)}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {getRoomName(nextAppointment)}
              </span>
            </div>
            <div className="therapist-next-actions">
              <Link to={`/therapist/appointments/${nextAppointment.id}`}>
                <Button size="sm">Xem chi tiết</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Today's appointments */}
      <section className="therapist-section" aria-label="Lịch hôm nay">
        <div className="customer-section-header">
          <h2 className="customer-section-title">Lịch hôm nay</h2>
          <Link to="/therapist/schedule" className="customer-section-link">
            Xem lịch làm việc
          </Link>
        </div>

        {todays.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            title="Hôm nay chưa có ca nào"
            description="Khi có lịch hẹn được phân công cho bạn, các ca sẽ hiển thị ở đây."
          />
        ) : (
          <div className="therapist-shift-list">
            {todays.map((apt) => {
              const statusVariant = APPOINTMENT_STATUS_VARIANTS[apt.status] || 'neutral';
              const statusLabel = APPOINTMENT_STATUS_LABELS[apt.status] || apt.status;
              const isPast = apt.status === APPOINTMENT_STATUS.COMPLETED;
              const isLive = apt.status === APPOINTMENT_STATUS.IN_TREATMENT;
              return (
                <Link
                  key={apt.id}
                  to={`/therapist/appointments/${apt.id}`}
                  className={`therapist-shift-item ${isLive ? 'is-live' : ''} ${isPast ? 'is-past' : ''}`}
                >
                  <div className="therapist-shift-time">
                    <div className="therapist-shift-time-start">{formatTime(apt.startTime)}</div>
                    {apt.endTime && (
                      <div className="therapist-shift-time-end">
                        đến {formatTime(apt.endTime)}
                      </div>
                    )}
                  </div>
                  <div className="therapist-shift-content">
                    <div className="therapist-shift-service">{getServiceName(apt)}</div>
                    <div className="therapist-shift-meta">
                      <span>{getCustomerName(apt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Phòng {getRoomName(apt)}</span>
                    </div>
                  </div>
                  <div className="therapist-shift-status">
                    <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)', marginTop: 'var(--space-2)' }}>
        Định dạng ngày: {formatDateLong(today)}.
      </p>
    </div>
  );
}

export default TherapistDashboard;
