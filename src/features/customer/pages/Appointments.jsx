import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyAppointments,
  cancelAppointment,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from '@/services/customerService';
import {
  Button,
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';
import { resolveTreatmentImage } from '@/utils/treatmentImages';
import useFlashMessage from '@/hooks/useFlashMessage';
import './Appointments.css';

const TABS = [
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const UPCOMING_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.ACCEPTED,
  APPOINTMENT_STATUS.IN_TREATMENT,
];

const getServiceImage = (appointment) => {
  // Resolve through the shared treatment image resolver so the embedded
  // service object on an appointment (which has no `image` field from the
  // backend) still picks up the deterministic UUID-based local asset.
  return resolveTreatmentImage(appointment.service || appointment);
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  return String(timeString).substring(0, 5);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isFutureAppointment = (apt) => {
  if (!apt?.date) return false;
  const datePart = apt.date.length > 10 ? apt.date.split('T')[0] : apt.date;
  const startTime = (apt.startTime || '00:00').substring(0, 5);
  const start = new Date(`${datePart}T${startTime}:00`);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() >= Date.now();
};

const canEdit = (apt) => apt?.status === APPOINTMENT_STATUS.PENDING;

const canCancel = (apt) => {
  if (!apt) return false;
  if (apt.status === APPOINTMENT_STATUS.CANCELLED) return false;
  if (apt.status === APPOINTMENT_STATUS.COMPLETED) return false;
  if (apt.status === APPOINTMENT_STATUS.IN_TREATMENT) return false;
  return isFutureAppointment(apt);
};

function CustomerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const flash = useFlashMessage();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyAppointments();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setAppointments(list);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tải lịch hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelAppointment(cancelTarget.id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id
          ? { ...a, status: APPOINTMENT_STATUS.CANCELLED }
          : a))
      );
      flash.show('Đã hủy lịch hẹn.');
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      flash.show(err.response?.data?.message || err.message || 'Không thể hủy lịch hẹn.');
    } finally {
      setCancelLoading(false);
      setCancelTarget(null);
    }
  };

  const filteredAppointments = useMemo(() => {
    if (filter === 'upcoming') {
      return [...appointments]
        .filter((apt) => UPCOMING_STATUSES.includes(apt.status))
        .sort((a, b) => {
          const ad = new Date(`${a.date}T${(a.startTime || '00:00').substring(0, 5)}`).getTime();
          const bd = new Date(`${b.date}T${(b.startTime || '00:00').substring(0, 5)}`).getTime();
          return ad - bd;
        });
    }
    if (filter === 'completed') {
      return appointments.filter((apt) => apt.status === APPOINTMENT_STATUS.COMPLETED);
    }
    if (filter === 'cancelled') {
      return appointments.filter((apt) => apt.status === APPOINTMENT_STATUS.CANCELLED);
    }
    return appointments;
  }, [appointments, filter]);

  if (loading) {
    return <LoadingState message="Đang tải lịch hẹn của bạn..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAppointments} />;
  }

  return (
    <div className="apt-page-root">
      {/* Page Header */}
      <div className="apt-page-header">
        <div className="apt-page-header-left">
          <Link to="/customer" className="back-to-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại
          </Link>
          <h1 className="apt-page-title">Lịch hẹn của tôi</h1>
          <p className="apt-page-subtitle">Quản lý các lịch hẹn spa của bạn</p>
        </div>
        <div className="apt-page-header-right">
          <Link to="/customer/appointments/new">
            <Button>Đặt lịch mới</Button>
          </Link>
        </div>
      </div>

      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      {/* Tabs */}
      <div className="customer-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            className={`customer-tab ${filter === tab.key ? 'is-active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          title={
            filter === 'upcoming'
              ? 'Bạn chưa có lịch hẹn sắp tới'
              : filter === 'completed'
              ? 'Chưa có lịch hẹn hoàn thành'
              : 'Chưa có lịch hẹn đã hủy'
          }
          description={
            filter === 'upcoming'
              ? 'Hãy đặt lịch để trải nghiệm các dịch vụ spa tuyệt vời tại Omamori.'
              : 'Các lịch hẹn thuộc danh mục này sẽ hiển thị ở đây.'
          }
          action={
            filter === 'upcoming' && (
              <Link to="/customer/appointments/new">
                <Button>Đặt lịch ngay</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="apt-list">
          {filteredAppointments.map((appointment) => {
            const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status;
            const statusVariant = APPOINTMENT_STATUS_VARIANTS[appointment.status] || 'neutral';
            const serviceName = appointment.service?.name || appointment.serviceName || 'Dịch vụ';
            const therapistName = appointment.therapistName || appointment.therapist?.name;
            const roomName = appointment.roomName || appointment.room?.name;
            const serviceImage = getServiceImage(appointment);
            const isEditable = canEdit(appointment);
            const isCancellable = canCancel(appointment);

            return (
              <div key={appointment.id} className="apt-card">
                <div className="apt-card-datetime">
                  <div className="apt-card-date">{formatDate(appointment.date)}</div>
                  <div className="apt-card-time">{formatTime(appointment.startTime)}</div>
                </div>

                <div className="apt-card-main">
                  <div className="apt-card-header">
                    {serviceImage && (
                      <div className="apt-card-thumb">
                        <img src={serviceImage} alt={serviceName} loading="lazy" />
                      </div>
                    )}
                    <div className="apt-card-service-info">
                      <div className="apt-card-service">{serviceName}</div>
                      <div className="apt-card-meta">
                        {therapistName && (
                          <span className="apt-card-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            KTV: {therapistName}
                          </span>
                        )}
                        {roomName && (
                          <span className="apt-card-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            {roomName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="apt-card-footer">
                    <div className="apt-card-status-mobile">
                      <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
                    </div>
                    <div className="apt-card-actions">
                      <Link
                        to={`/customer/appointments/${appointment.id}`}
                        className="apt-action-btn apt-action-view"
                      >
                        Chi tiết
                      </Link>
                      {isEditable && (
                        <Link
                          to={`/customer/appointments/${appointment.id}/edit`}
                          className="apt-action-btn apt-action-edit"
                        >
                          Chỉnh sửa
                        </Link>
                      )}
                      {isCancellable && (
                        <button
                          type="button"
                          className="apt-action-btn apt-action-cancel"
                          onClick={() => setCancelTarget(appointment)}
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="apt-card-status-desktop">
                  <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => !cancelLoading && setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Xác nhận hủy lịch hẹn"
        message={
          cancelTarget
            ? `Bạn có chắc chắn muốn hủy lịch hẹn ${
                cancelTarget.service?.name || cancelTarget.serviceName || 'này'
              }? Sau khi hủy, trạng thái lịch sẽ chuyển sang "Đã hủy".`
            : 'Bạn có chắc chắn muốn hủy lịch hẹn này?'
        }
        confirmText="Hủy lịch hẹn"
        cancelText="Không"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}

export default CustomerAppointments;
