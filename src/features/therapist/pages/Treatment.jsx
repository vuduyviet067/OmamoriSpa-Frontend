import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getAppointmentById,
  saveTreatmentJournal,
  getTreatmentRecord,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from '@/services/therapistService';
import {
  Button,
  LoadingState,
  ErrorState,
  StatusBadge,
} from '@/components/common';
import useFlashMessage from '@/hooks/useFlashMessage';

const formatDateLong = (iso) => {
  if (!iso) return '';
  const datePart = iso.length > 10 ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  const datePart = iso.length > 10 ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  const timePart = iso.length > 10 ? iso.substring(11, 16) : '';
  return `${d}/${m}/${y}${timePart ? ` ${timePart}` : ''}`;
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

function Treatment() {
  const { appointmentId } = useParams();
  const flash = useFlashMessage();

  const [appointment, setAppointment] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [appointmentError, setAppointmentError] = useState(null);

  const [conditionNotes, setConditionNotes] = useState('');
  const [improvementNotes, setImprovementNotes] = useState('');
  const [remainingSessions, setRemainingSessions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [preservedOnError, setPreservedOnError] = useState(false);

  const [record, setRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);

  const loadAppointment = useCallback(async () => {
    setAppointmentLoading(true);
    setAppointmentError(null);
    try {
      const data = await getAppointmentById(appointmentId);
      setAppointment(data);
    } catch (err) {
      console.error('Error loading appointment:', err);
      setAppointmentError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải thông tin ca trị liệu.'
      );
    } finally {
      setAppointmentLoading(false);
    }
  }, [appointmentId]);

  const loadRecord = useCallback(async () => {
    setRecordLoading(true);
    try {
      const data = await getTreatmentRecord(appointmentId);
      setRecord(data);
    } catch (err) {
      console.error('Error loading therapy record:', err);
    } finally {
      setRecordLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadAppointment();
    loadRecord();
  }, [loadAppointment, loadRecord]);

  const isCompleted = appointment?.status === APPOINTMENT_STATUS.COMPLETED;
  const isInProgress = appointment?.status === APPOINTMENT_STATUS.IN_PROGRESS;

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!appointment) return false;
    return true;
  }, [submitting, appointment]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setPreservedOnError(false);

    const payload = {
      conditionNotes: conditionNotes.trim() || null,
      improvementNotes: improvementNotes.trim() || null,
      remainingSessions: remainingSessions ? Number(remainingSessions) : null,
    };

    try {
      await saveTreatmentJournal(appointmentId, payload);
      flash.show('Đã lưu hồ sơ trị liệu & hoàn thành ca.');
      loadRecord();
      loadAppointment();
    } catch (err) {
      console.error('Error saving therapy record:', err);
      const message = err.response?.data?.message
        || err.message
        || 'Không thể lưu hồ sơ trị liệu. Vui lòng thử lại.';
      setSubmitError(message);
      setPreservedOnError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (appointmentLoading) {
    return <LoadingState message="Đang tải thông tin ca trị liệu..." />;
  }

  if (appointmentError) {
    return <ErrorState message={appointmentError} onRetry={loadAppointment} />;
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

  return (
    <div className="therapist-treatment">
      <Link to={`/therapist/appointments/${appointment.id}`} className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại ca trị liệu
      </Link>

      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}

      {submitError && (
        <div className="booking-alert booking-alert-error" role="alert">
          <strong>Đã xảy ra lỗi:</strong> {submitError}
          {preservedOnError && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              Thông tin hồ sơ được giữ lại để bạn thử lại.
            </div>
          )}
        </div>
      )}

      <section className="customer-card therapist-treatment-summary">
        <header className="booking-detail-header">
          <div>
            <h1>Điều trị - {getServiceName(appointment)}</h1>
            <p className="therapist-appointment-code">
              Ca <strong>#{appointment.id}</strong> · {getCustomerName(appointment)}
            </p>
          </div>
          <StatusBadge status={statusVariant}>{statusLabel}</StatusBadge>
        </header>

        <div className="booking-detail-grid">
          <div className="booking-detail-row">
            <span className="booking-detail-label">Khách hàng</span>
            <span className="booking-detail-value">{getCustomerName(appointment)}</span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Ngày</span>
            <span className="booking-detail-value">{formatDateLong(appointment.date)}</span>
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Thời gian</span>
            <span className="booking-detail-value">
              {(appointment.startTime || '').substring(0, 5)}
              {appointment.endTime && ` - ${(appointment.endTime || '').substring(0, 5)}`}
            </span>
            {duration && (
              <span className="booking-detail-subvalue">
                Thời lượng: {duration} phút
              </span>
            )}
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Phòng</span>
            <span className="booking-detail-value">{getRoomName(appointment)}</span>
          </div>
        </div>
      </section>

      {!isCompleted && (
        <form className="customer-card therapist-journal" onSubmit={handleSubmit} noValidate>
          <div className="customer-card-title">
            Hồ sơ trị liệu
          </div>

          {!isInProgress && (
            <div className="booking-alert booking-alert-warning" role="status">
              Ca đang ở trạng thái &ldquo;{statusLabel}&rdquo;. Bạn nên bắt đầu ca trước khi lưu hồ sơ.
            </div>
          )}

          <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label htmlFor="condition-notes" className="input-label">Tình trạng</label>
            <textarea
              id="condition-notes"
              className="input therapist-journal-textarea"
              rows={4}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="Mô tả tình trạng da, vùng điều trị, phản ứng của khách..."
            />
          </div>

          <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label htmlFor="improvement-notes" className="input-label">Kết quả / Cải thiện</label>
            <textarea
              id="improvement-notes"
              className="input therapist-journal-textarea"
              rows={4}
              value={improvementNotes}
              onChange={(e) => setImprovementNotes(e.target.value)}
              placeholder="Ghi nhận kết quả điều trị, cải thiện sau buổi..."
            />
          </div>

          <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label htmlFor="remaining-sessions" className="input-label">Số buổi còn lại</label>
            <input
              id="remaining-sessions"
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              value={remainingSessions}
              onChange={(e) => setRemainingSessions(e.target.value)}
              placeholder="VD: 5"
            />
          </div>

          <div className="therapist-journal-actions">
            <Button
              type="submit"
              disabled={submitting}
              loading={submitting}
            >
              {submitting
                ? 'Đang lưu...'
                : 'Lưu hồ sơ & Hoàn thành ca'}
            </Button>
          </div>
        </form>
      )}

      {isCompleted && (
        <section className="customer-card therapist-journal">
          <div className="customer-card-title">
            Hồ sơ trị liệu
          </div>

          {recordLoading ? (
            <LoadingState
              message="Đang tải hồ sơ trị liệu..."
            />
          ) : record ? (
            <div className="booking-detail-grid">
              <div className="booking-detail-row">
                <span className="booking-detail-label">
                  Tình trạng
                </span>

                <span className="booking-detail-value">
                  {record.conditionNotes || '—'}
                </span>
              </div>

              <div className="booking-detail-row">
                <span className="booking-detail-label">
                  Kết quả / Cải thiện
                </span>

                <span className="booking-detail-value">
                  {record.improvementNotes || '—'}
                </span>
              </div>

              <div className="booking-detail-row">
                <span className="booking-detail-label">
                  Số buổi còn lại
                </span>

                <span className="booking-detail-value">
                  {record.remainingSessions ?? '—'}
                </span>
              </div>

              <div className="booking-detail-row">
                <span className="booking-detail-label">
                  Thời điểm ghi nhận
                </span>

                <span className="booking-detail-value">
                  {formatDateTime(record.recordedAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="booking-alert booking-alert-warning">
              Chưa tìm thấy hồ sơ trị liệu.
            </div>
          )}
        </section>
      )}

      {!isInProgress && !isCompleted && (
        <div className="booking-alert booking-alert-info" role="status">
          Hãy bắt đầu ca trị liệu trước khi ghi hồ sơ.
        </div>
      )}
    </div>
  );
}

export default Treatment;
