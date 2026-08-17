import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  getAppointmentById,
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
  ConfirmDialog,
} from '@/components/common';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import useFlashMessage from '@/hooks/useFlashMessage';

const formatDateLong = (iso) => {
  if (!iso) return '';
  const datePart = iso.length > 10 ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
};

function isFuture(appointment) {
  if (!appointment?.date) return false;
  const datePart = appointment.date.length > 10
    ? appointment.date.split('T')[0]
    : appointment.date;
  const startTime = (appointment.startTime || '00:00').substring(0, 5);
  const start = new Date(`${datePart}T${startTime}:00`);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() >= Date.now();
}

function canEdit(appointment) {
  return appointment?.status === APPOINTMENT_STATUS.PENDING;
}

function canCancel(appointment) {
  if (!appointment) return false;
  if (appointment.status === APPOINTMENT_STATUS.CANCELLED) return false;
  if (appointment.status === APPOINTMENT_STATUS.COMPLETED) return false;
  if (appointment.status === APPOINTMENT_STATUS.IN_TREATMENT) return false;
  return isFuture(appointment);
}

function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const flash = useFlashMessage();
  const updatedRef = useRef(false);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadAppointment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointmentById(id);
      setAppointment(data);
    } catch (err) {
      console.error('Error loading appointment:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tải lịch hẹn.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    if (location.state?.updated && !updatedRef.current) {
      flash.show('Cập nhật lịch hẹn thành công.');
      updatedRef.current = true;
      window.history.replaceState({}, document.title, location.pathname);
    }
    // Only re-run when navigation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleCancel = async () => {
    if (!appointment) return;
    setCancelLoading(true);
    try {
      await cancelAppointment(appointment.id);
      setShowCancelDialog(false);
      flash.show('Đã hủy lịch hẹn.');
      await loadAppointment();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      flash.show(err.response?.data?.message || err.message || 'Không thể hủy lịch hẹn.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải chi tiết lịch hẹn..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAppointment} />;
  }

  if (!appointment) {
    return (
      <ErrorState
        title="Không tìm thấy lịch hẹn"
        message="Lịch hẹn không tồn tại hoặc đã bị xoá."
      />
    );
  }

  const service = appointment.service || {};
  const serviceName = service.name || appointment.serviceName || 'Dịch vụ';
  const duration = service.duration || service.durationMinutes;
  const price = service.price ?? appointment.price;

  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status;
  const statusVariant = APPOINTMENT_STATUS_VARIANTS[appointment.status] || 'neutral';

  return (
    <div>
      <Link to="/customer/appointments" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại
      </Link>

      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      <div className="booking-detail-card customer-card">
        <div className="booking-detail-header">
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 600,
              marginBottom: 'var(--space-2)',
            }}>
              {serviceName}
            </h1>
            <p style={{ color: 'var(--color-charcoal-muted)', marginBottom: 0, fontSize: 'var(--text-sm)' }}>
              Mã lịch hẹn: <strong>#{appointment.id}</strong>
            </p>
          </div>
          <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
        </div>

        <div className="booking-detail-grid">
          <div className="booking-detail-row">
            <span className="booking-detail-label">Ngày</span>
            <span className="booking-detail-value">{formatDateLong(appointment.date)}</span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Giờ bắt đầu</span>
            <span className="booking-detail-value">
              {(appointment.startTime || '').substring(0, 5)}
              {appointment.endTime && ` - ${String(appointment.endTime).substring(0, 5)}`}
            </span>
          </div>
          {duration && (
            <div className="booking-detail-row">
              <span className="booking-detail-label">Thời lượng</span>
              <span className="booking-detail-value">{formatDuration(duration)}</span>
            </div>
          )}
          <div className="booking-detail-row">
            <span className="booking-detail-label">Kỹ thuật viên</span>
            <span className="booking-detail-value">
              {appointment.therapistName
                || appointment.therapist?.name
                || 'Sẽ được phân công'}
            </span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Phòng</span>
            <span className="booking-detail-value">
              {appointment.roomName
                || appointment.room?.name
                || 'Sẽ được phân công'}
            </span>
          </div>
          {price !== null && price !== undefined && (
            <div className="booking-detail-row">
              <span className="booking-detail-label">Chi phí dự kiến</span>
              <span className="booking-detail-value booking-detail-price">
                {formatCurrency(price)}
              </span>
            </div>
          )}
        </div>

        <div className="booking-detail-actions">
          {canEdit(appointment) && (
            <Button variant="secondary" onClick={() => navigate(`/customer/appointments/${id}/edit`)}>
              Chỉnh sửa
            </Button>
          )}
          {canCancel(appointment) && (
            <Button variant="ghost" onClick={() => setShowCancelDialog(true)}>
              Hủy lịch hẹn
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => !cancelLoading && setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Xác nhận hủy lịch hẹn"
        message="Bạn có chắc chắn muốn hủy lịch hẹn này? Hành động này không thể hoàn tác."
        confirmText="Hủy lịch hẹn"
        cancelText="Không"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}

export default AppointmentDetail;
