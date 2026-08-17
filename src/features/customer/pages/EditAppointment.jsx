import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import BookingWizard from '../components/BookingWizard';
import {
  getAppointmentById,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
} from '@/services/customerService';
import { Button, LoadingState, ErrorState } from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

function EditAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const flash = useFlashMessage();
  const successShownRef = useRef(false);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    if (location.state?.updated && !successShownRef.current) {
      flash.show('Cập nhật lịch hẹn thành công.');
      successShownRef.current = true;
      window.history.replaceState({}, document.title, location.pathname);
    }
    // Only re-run when navigation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  if (loading) {
    return <LoadingState message="Đang tải thông tin lịch hẹn..." />;
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

  // Per UC: only PENDING appointments are editable.
  if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
    return (
      <div>
        <Link to={`/customer/appointments/${id}`} className="back-to-home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Quay lại
        </Link>
        <div className="booking-alert booking-alert-warning" role="alert">
          Lịch hẹn đang ở trạng thái{' '}
          <strong>{APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status}</strong>,
          không thể chỉnh sửa. Bạn chỉ có thể chỉnh sửa khi lịch còn ở trạng thái
          &ldquo;Chờ xác nhận&rdquo;.
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => navigate(`/customer/appointments/${id}`)}>
            Xem chi tiết lịch hẹn
          </Button>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    navigate(`/customer/appointments/${id}`, {
      state: { updated: true },
      replace: true,
    });
  };

  return (
    <div>
      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}
      <BookingWizard mode="edit" initialAppointment={appointment} onSuccess={handleSuccess} />
    </div>
  );
}

export default EditAppointment;
