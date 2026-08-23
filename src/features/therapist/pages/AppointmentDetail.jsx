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
import useFlashMessage from '@/hooks/useFlashMessage';
import { formatDuration } from '@/utils/formatters';

const TRANSITION_BUTTON_META = {
  [APPOINTMENT_STATUS.PENDING]: {
    label: 'Chờ xác nhận',
    helper: 'Ca đã được phân công cho bạn và đang chờ xác nhận.',
    buttonLabel: 'Xác nhận ca',
  },


  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: 'Đã xác nhận',
    helper: 'Ca đã được xác nhận và sẵn sàng bắt đầu.',
    buttonLabel: 'Bắt đầu trị liệu',
  },


  [APPOINTMENT_STATUS.IN_PROGRESS]: {
    label: 'Đang trị liệu',
    helper: 'Hãy mở hồ sơ trị liệu để ghi nhật ký và hoàn tất ca.',
    buttonLabel: null,
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

  // Therapists can progress an appointment in two steps:
  //   PENDING   -> CONFIRMED
  //   CONFIRMED -> IN_PROGRESS
  // The final IN_PROGRESS -> COMPLETED transition is owned by the
  // treatment journal on the backend.
  const transitions = useMemo(() => {
    if (!appointment) return [];
    return ALLOWED_TRANSITIONS[appointment.status] || [];
  }, [appointment]);

  const meta = appointment ? TRANSITION_BUTTON_META[appointment.status] : null;
  const nextStatus = meta ? transitions[0] : null;

  const canTransitionTo = useCallback((next) => {
    if (!appointment || !next) {
      return false;
    }

    return transitions.includes(next);
  }, [appointment, transitions]);

  const requestTransition = (next) => {
    if (!canTransitionTo(next)) return;


    // Bắt đầu trị liệu thực hiện trực tiếp.
    if (next === APPOINTMENT_STATUS.IN_PROGRESS) {
      handleTransition(next);
      return;
    }


    // Xác nhận PENDING -> CONFIRMED cần dialog.
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
  const showTreatmentLink =
    appointment.status === APPOINTMENT_STATUS.IN_PROGRESS
    || appointment.status === APPOINTMENT_STATUS.COMPLETED;

  const isInProgress =
    appointment.status === APPOINTMENT_STATUS.IN_PROGRESS;

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
            <span className="booking-detail-value">{getRoomName(appointment)}</span>
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
              {isInProgress && (
                <div
                  className="therapist-status-locked"
                  role="status"
                >
                  Ca đang được thực hiện. Hãy mở hồ sơ trị liệu để
                  ghi nhật ký và hoàn tất ca.
                </div>
              )}


              {!transitions.length && !isInProgress && (
                <div
                  className="therapist-status-locked"
                  role="status"
                >
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
        isOpen={
          pendingTransition ===
          APPOINTMENT_STATUS.CONFIRMED
        }
        onClose={() => {
          if (!actionLoading) {
            setPendingTransition(null);
          }
        }}
        onConfirm={() =>
          handleTransition(
            APPOINTMENT_STATUS.CONFIRMED
          )
        }
        title="Xác nhận ca trị liệu"
        message={`Bạn xác nhận tiếp nhận ca ${getServiceName(
          appointment
        )} cho khách ${getCustomerName(appointment)}?`}
        confirmText="Xác nhận ca"
        cancelText="Hủy"
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
