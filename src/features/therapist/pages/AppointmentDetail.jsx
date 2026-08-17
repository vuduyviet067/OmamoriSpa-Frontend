import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getAppointmentById,
  updateAppointmentStatus,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  ALLOWED_TRANSITIONS,
} from '@/services/therapistService';
import {
  Button,
  StatusBadge,
  LoadingState,
  ErrorState,
  ConfirmDialog,
} from '@/components/common';
import { formatDuration } from '@/utils/formatters';
import useFlashMessage from '@/hooks/useFlashMessage';

const TRANSITION_BUTTON_META = {
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: 'Đã xác nhận',
    helper: 'Ca đã được xác nhận, sẵn sàng tiếp nhận khách.',
    buttonLabel: 'Tiếp nhận khách',
  },
  [APPOINTMENT_STATUS.ACCEPTED]: {
    label: 'Đã tiếp nhận',
    helper: 'Xác nhận bạn sẽ phụ trách ca này.',
    buttonLabel: 'Bắt đầu trị liệu',
  },
  [APPOINTMENT_STATUS.IN_TREATMENT]: {
    label: 'Đang trị liệu',
    helper: 'Ca đang được thực hiện.',
    buttonLabel: 'Hoàn thành trị liệu',
  },
};

const formatDateLong = (iso) => {
  if (!iso) return '';
  const datePart = iso.length > 10 ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  return String(timeString).substring(0, 5);
};

/**
 * Returns a Date for the appointment start, or null if invalid.
 */
const parseStart = (appointment) => {
  if (!appointment?.date) return null;
  const datePart = appointment.date.length > 10
    ? appointment.date.split('T')[0]
    : appointment.date;
  const startTime = (appointment.startTime || '00:00').substring(0, 5);
  const start = new Date(`${datePart}T${startTime}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
};

const getCustomerName = (apt) =>
  apt.customerName || apt.customer?.name || apt.customer?.fullName || 'Khách hàng';

const getServiceName = (apt) =>
  apt.service?.name || apt.serviceName || 'Dịch vụ';

const getRoomName = (apt) =>
  apt.roomName || apt.room?.name || '—';

const getDuration = (apt) => {
  const svc = apt.service || {};
  return svc.duration || svc.durationMinutes || apt.duration || null;
};

function TherapistAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const flash = useFlashMessage();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);

  const loadAppointment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointmentById(id);
      setAppointment(data);
    } catch (err) {
      console.error('Error loading appointment:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải thông tin ca trị liệu.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const start = useMemo(() => parseStart(appointment), [appointment]);

  // Therapists can only progress an appointment that has already begun,
  // except for the initial "accept" step (PENDING/CONFIRMED -> ACCEPTED),
  // which we allow before start so they can confirm upcoming shifts.
  const transitions = useMemo(() => {
    if (!appointment) return [];
    return ALLOWED_TRANSITIONS[appointment.status] || [];
  }, [appointment]);

  const meta = appointment ? TRANSITION_BUTTON_META[appointment.status] : null;
  const nextStatus = meta ? transitions[0] : null;

  const canTransitionTo = useCallback((next) => {
    if (!appointment || !next) return false;
    if (!transitions.includes(next)) return false;
    if (!start) return true; // backend is the source of truth; allow optimistic UI.
    // Block IN_TREATMENT/COMPLETED transitions when the start is in the future,
    // but allow ACCEPTED transitions at any time (technicians can confirm shifts).
    const now = Date.now();
    if (next === APPOINTMENT_STATUS.IN_TREATMENT) {
      // Allow starting up to 15 minutes before the official start.
      return start.getTime() - 15 * 60 * 1000 <= now;
    }
    if (next === APPOINTMENT_STATUS.COMPLETED) {
      // Cannot complete before the appointment begins.
      return start.getTime() <= now;
    }
    return true;
  }, [appointment, transitions, start]);

  const requestTransition = (next) => {
    if (!canTransitionTo(next)) return;
    if (next === APPOINTMENT_STATUS.IN_TREATMENT || next === APPOINTMENT_STATUS.ACCEPTED) {
      // Inline transition - no confirmation modal needed.
      handleTransition(next);
      return;
    }
    setPendingTransition(next);
  };

  const handleTransition = async (next) => {
    if (!appointment || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await updateAppointmentStatus(appointment.id, next);
      setAppointment((prev) => ({ ...(prev || {}), ...(updated || {}), status: next }));
      flash.show(`Đã cập nhật trạng thái: ${APPOINTMENT_STATUS_LABELS[next] || next}.`);
    } catch (err) {
      console.error('Error updating appointment status:', err);
      flash.show(
        err.response?.data?.message
          || err.message
          || 'Không thể cập nhật trạng thái. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(false);
      setPendingTransition(null);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải thông tin ca trị liệu..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAppointment} />;
  }

  if (!appointment) {
    return (
      <ErrorState
        title="Không tìm thấy ca trị liệu"
        message="Ca trị liệu không tồn tại hoặc bạn không có quyền truy cập."
      />
    );
  }

  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status;
  const statusVariant = APPOINTMENT_STATUS_VARIANTS[appointment.status] || 'neutral';
  const duration = getDuration(appointment);
  const isTerminal = appointment.status === APPOINTMENT_STATUS.COMPLETED
    || appointment.status === APPOINTMENT_STATUS.CANCELLED;
  const noteText = appointment.notes || appointment.note || appointment.customerNote || null;
  const showTreatmentLink = appointment.status === APPOINTMENT_STATUS.ACCEPTED
    || appointment.status === APPOINTMENT_STATUS.IN_TREATMENT
    || appointment.status === APPOINTMENT_STATUS.COMPLETED;

  return (
    <div className="therapist-appointment-detail">
      <Link to="/therapist/schedule" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại lịch làm việc
      </Link>

      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      <section className="customer-card therapist-appointment-card">
        <header className="booking-detail-header">
          <div>
            <h1>{getServiceName(appointment)}</h1>
            <p className="therapist-appointment-code">
              Mã ca: <strong>#{appointment.id}</strong>
            </p>
          </div>
          <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
        </header>

        <div className="booking-detail-grid">
          <div className="booking-detail-row">
            <span className="booking-detail-label">Khách hàng</span>
            <span className="booking-detail-value">{getCustomerName(appointment)}</span>
            {appointment.customer?.phone && (
              <span className="booking-detail-subvalue">{appointment.customer.phone}</span>
            )}
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Ngày</span>
            <span className="booking-detail-value">{formatDateLong(appointment.date)}</span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Thời gian</span>
            <span className="booking-detail-value">
              {formatTime(appointment.startTime)}
              {appointment.endTime && ` - ${formatTime(appointment.endTime)}`}
            </span>
            {duration && (
              <span className="booking-detail-subvalue">
                Thời lượng: {formatDuration(duration)}
              </span>
            )}
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Dịch vụ</span>
            <span className="booking-detail-value">{getServiceName(appointment)}</span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Phòng</span>
            <span className="booking-detail-value">Phòng {getRoomName(appointment)}</span>
          </div>
          {appointment.service?.price !== undefined && appointment.service?.price !== null && (
            <div className="booking-detail-row">
              <span className="booking-detail-label">Giá dịch vụ</span>
              <span className="booking-detail-value booking-detail-price">
                {Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
                  .format(appointment.service.price)}
              </span>
            </div>
          )}
        </div>

        {noteText && (
          <div className="therapist-appointment-note">
            <h4>Ghi chú từ khách hàng</h4>
            <p>{noteText}</p>
          </div>
        )}

        <div className="therapist-status-actions" aria-label="Thao tác trạng thái">
          {meta && nextStatus && (
            <div className="therapist-status-current">
              <span className="therapist-status-current-label">Trạng thái hiện tại:</span>
              <StatusBadge status={statusVariant}>{meta.label}</StatusBadge>
              <span className="therapist-status-current-helper">{meta.helper}</span>
            </div>
          )}

          {isTerminal && (
            <div className="therapist-status-locked" role="status">
              Ca trị liệu đã ở trạng thái cuối và không thể chuyển đổi thêm.
            </div>
          )}

          {!isTerminal && (
            <div className="therapist-status-buttons">
              {transitions.map((next) => {
                const allowed = canTransitionTo(next);
                const buttonLabel = meta?.buttonLabel || APPOINTMENT_STATUS_LABELS[next] || next;
                const reason = !allowed
                  ? 'Chưa đến thời gian phù hợp để chuyển trạng thái này.'
                  : null;

                return (
                  <div key={next} className="therapist-status-button-wrap">
                    <Button
                      variant={next === APPOINTMENT_STATUS.COMPLETED ? 'primary' : 'secondary'}
                      disabled={!allowed || actionLoading}
                      loading={actionLoading && pendingTransition === next}
                      onClick={() => requestTransition(next)}
                    >
                      {buttonLabel}
                    </Button>
                    {reason && (
                      <span className="therapist-status-button-help">{reason}</span>
                    )}
                  </div>
                );
              })}
              {!transitions.length && (
                <div className="therapist-status-locked" role="status">
                  Trạng thái hiện tại không cho phép thao tác thêm.
                </div>
              )}
            </div>
          )}
        </div>

        {showTreatmentLink && (
          <div className="therapist-appointment-actions">
            <Link to={`/therapist/treatments/${appointment.id}`}>
              <Button>
                {appointment.status === APPOINTMENT_STATUS.COMPLETED
                  ? 'Xem nhật ký trị liệu'
                  : 'Mở hồ sơ trị liệu'}
              </Button>
            </Link>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingTransition === APPOINTMENT_STATUS.ACCEPTED}
        onClose={() => !actionLoading && setPendingTransition(null)}
        onConfirm={() => handleTransition(APPOINTMENT_STATUS.ACCEPTED)}
        title="Xác nhận tiếp nhận ca"
        message={`Bạn xác nhận sẽ phụ trách ca ${getServiceName(appointment)} cho khách ${getCustomerName(appointment)}?`}
        confirmText="Tiếp nhận"
        cancelText="Hủy"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={pendingTransition === APPOINTMENT_STATUS.COMPLETED}
        onClose={() => !actionLoading && setPendingTransition(null)}
        onConfirm={() => handleTransition(APPOINTMENT_STATUS.COMPLETED)}
        title="Hoàn thành ca trị liệu"
        message={`Xác nhận ca ${getServiceName(appointment)} đã hoàn thành? Bạn sẽ không thể chuyển trạng thái về trước đó.`}
        confirmText="Hoàn thành"
        cancelText="Hủy"
        variant="primary"
        loading={actionLoading}
      />

      <div className="therapist-appointment-footer">
        <Button variant="ghost" onClick={() => navigate('/therapist/schedule')}>
          Về lịch làm việc
        </Button>
      </div>
    </div>
  );
}

export default TherapistAppointmentDetail;
