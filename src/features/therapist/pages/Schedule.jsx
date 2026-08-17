import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMySchedule,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  toISODate,
} from '@/services/therapistService';
import {
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

const TABS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
];

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatTime = (timeString) => {
  if (!timeString) return '';
  return String(timeString).substring(0, 5);
};

const getCustomerName = (apt) =>
  apt.customerName || apt.customer?.name || apt.customer?.fullName || 'Khách hàng';

const getServiceName = (apt) =>
  apt.service?.name || apt.serviceName || 'Dịch vụ';

const getRoomName = (apt) =>
  apt.roomName || apt.room?.name || '—';

/**
 * Compute the date range for the current week (Mon..Sun) in local time.
 */
const getWeekRange = (reference = new Date()) => {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0..6 (Sun..Sat)
  const diffToMonday = (dayOfWeek + 6) % 7; // distance to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
};

const formatDateVN = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatWeekday = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return DAY_LABELS[d.getDay()];
};

function AppointmentRow({ appointment }) {
  const statusVariant = APPOINTMENT_STATUS_VARIANTS[appointment.status] || 'neutral';
  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status;

  return (
    <Link
      to={`/therapist/appointments/${appointment.id}`}
      className={`therapist-schedule-row ${
        appointment.status === APPOINTMENT_STATUS.IN_TREATMENT ? 'is-live' : ''
      } ${appointment.status === APPOINTMENT_STATUS.COMPLETED ? 'is-past' : ''}`}
    >
      <div className="therapist-schedule-time">
        <div className="therapist-schedule-time-start">{formatTime(appointment.startTime)}</div>
        {appointment.endTime && (
          <div className="therapist-schedule-time-end">
            - {formatTime(appointment.endTime)}
          </div>
        )}
      </div>
      <div className="therapist-schedule-customer">
        <div className="therapist-schedule-customer-name">{getCustomerName(appointment)}</div>
        {appointment.customer?.phone && (
          <div className="therapist-schedule-customer-meta">
            {appointment.customer.phone}
          </div>
        )}
      </div>
      <div className="therapist-schedule-service">{getServiceName(appointment)}</div>
      <div className="therapist-schedule-room">Phòng {getRoomName(appointment)}</div>
      <div className="therapist-schedule-status">
        <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
      </div>
    </Link>
  );
}

function TherapistSchedule() {
  const flash = useFlashMessage();
  const [tab, setTab] = useState('today');
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
      console.error('Error fetching schedule:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải lịch làm việc. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const todayISO = useMemo(() => toISODate(new Date()), []);

  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(new Date()), []);

  const todaysAppointments = useMemo(() => {
    return appointments
      .filter((apt) => toISODate(apt.date) === todayISO)
      .filter((apt) => apt.status !== APPOINTMENT_STATUS.CANCELLED)
      .sort((a, b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));
  }, [appointments, todayISO]);

  const weekBuckets = useMemo(() => {
    const startISO = toISODate(weekStart);
    const endISO = toISODate(weekEnd);
    const filtered = appointments
      .filter((apt) => {
        const iso = toISODate(apt.date);
        return iso >= startISO && iso <= endISO;
      })
      .filter((apt) => apt.status !== APPOINTMENT_STATUS.CANCELLED)
      .sort((a, b) => {
        const dateCmp = toISODate(a.date).localeCompare(toISODate(b.date));
        if (dateCmp !== 0) return dateCmp;
        return formatTime(a.startTime).localeCompare(formatTime(b.startTime));
      });

    const buckets = new Map();
    filtered.forEach((apt) => {
      const iso = toISODate(apt.date);
      if (!buckets.has(iso)) buckets.set(iso, []);
      buckets.get(iso).push(apt);
    });

    return [...buckets.entries()]
      .map(([iso, list]) => ({ iso, list }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
  }, [appointments, weekStart, weekEnd]);

  if (loading) {
    return <LoadingState message="Đang tải lịch làm việc..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchSchedule} />;
  }

  return (
    <div className="therapist-schedule">
      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      <div className="therapist-page-header">
        <h1>Lịch làm việc</h1>
        <p>Xem các ca trị liệu được phân công cho bạn.</p>
      </div>

      <div className="therapist-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`therapist-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <section className="therapist-schedule-tabpanel" role="tabpanel" aria-label="Lịch hôm nay">
          <div className="therapist-schedule-day-label">
            Hôm nay · {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
          {todaysAppointments.length === 0 ? (
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
              description="Bạn có thể nghỉ ngơi hoặc kiểm tra lịch tuần này."
            />
          ) : (
            <div className="therapist-schedule-list">
              <div className="therapist-schedule-list-header">
                <span>Giờ</span>
                <span>Khách hàng</span>
                <span>Dịch vụ</span>
                <span>Phòng</span>
                <span>Trạng thái</span>
              </div>
              {todaysAppointments.map((apt) => (
                <AppointmentRow key={apt.id} appointment={apt} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'week' && (
        <section className="therapist-schedule-tabpanel" role="tabpanel" aria-label="Lịch tuần này">
          <div className="therapist-schedule-day-label">
            Tuần này · {formatDateVN(weekStart)} - {formatDateVN(weekEnd)}
          </div>
          {weekBuckets.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
              title="Tuần này chưa có ca nào"
              description="Các ca được phân công trong tuần sẽ hiển thị ở đây."
            />
          ) : (
            <div className="therapist-week-buckets">
              {weekBuckets.map(({ iso, list }) => {
                const date = new Date(`${iso}T00:00:00`);
                return (
                  <div key={iso} className="therapist-week-bucket">
                    <div className="therapist-week-bucket-header">
                      <span className="therapist-week-bucket-weekday">{formatWeekday(date)}</span>
                      <span className="therapist-week-bucket-date">{formatDateVN(date)}</span>
                      <span className="therapist-week-bucket-count">
                        {list.length} ca
                      </span>
                    </div>
                    <div className="therapist-schedule-list">
                      <div className="therapist-schedule-list-header">
                        <span>Giờ</span>
                        <span>Khách hàng</span>
                        <span>Dịch vụ</span>
                        <span>Phòng</span>
                        <span>Trạng thái</span>
                      </div>
                      {list.map((apt) => (
                        <AppointmentRow key={apt.id} appointment={apt} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default TherapistSchedule;
