import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getAppointmentById,
  getCustomerTreatmentHistory,
  getPrescribableCosmetics,
  saveTreatmentJournal,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from '@/services/therapistService';
import {
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
} from '@/components/common';
import { formatDuration } from '@/utils/formatters';
import useFlashMessage from '@/hooks/useFlashMessage';

const OUTCOME_OPTIONS = [
  { value: 'EXCELLENT', label: 'Rất tốt' },
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Trung bình' },
  { value: 'POOR', label: 'Cần theo dõi thêm' },
];

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

const getStockOf = (cosmetic) => {
  if (cosmetic?.stock !== undefined && cosmetic?.stock !== null) {
    return Number(cosmetic.stock) || 0;
  }
  if (cosmetic?.inventory?.quantity !== undefined && cosmetic?.inventory?.quantity !== null) {
    return Number(cosmetic.inventory.quantity) || 0;
  }
  if (cosmetic?.available !== undefined && cosmetic?.available !== null) {
    return Number(cosmetic.available) || 0;
  }
  return 0;
};

const getCosmeticName = (c) => c?.name || c?.productName || 'Mỹ phẩm';

const getCosmeticId = (c) => c?.id ?? c?._id ?? c?.value ?? null;

function TreatmentHistoryItem({ entry }) {
  const service = entry.serviceName || entry.service?.name || 'Dịch vụ';
  return (
    <li className="therapist-history-item">
      <div className="therapist-history-date">{formatDateTime(entry.date || entry.createdAt)}</div>
      <div className="therapist-history-body">
        <div className="therapist-history-service">{service}</div>
        {entry.notes && <p className="therapist-history-notes">{entry.notes}</p>}
        {entry.outcome && (
          <span className="therapist-history-outcome">Kết quả: {entry.outcome}</span>
        )}
      </div>
    </li>
  );
}

function PrescriptionRow({ item, onChange, onRemove, cosmeticOptions }) {
  const maxQty = item.stock || 0;
  const options = cosmeticOptions || [];
  return (
    <div className="therapist-rx-row">
      <div className="therapist-rx-product">
        <label htmlFor={`rx-product-${item.id}`} className="input-label">Sản phẩm</label>
        <select
          id={`rx-product-${item.id}`}
          className="input select"
          value={item.cosmeticId || ''}
          onChange={(e) => onChange(item.id, { cosmeticId: e.target.value, stock: options.find((o) => String(getCosmeticId(o)) === e.target.value)?.stock ?? 0 })}
        >
          <option value="">Chọn sản phẩm...</option>
          {options
            .filter((opt) => {
              const id = String(getCosmeticId(opt));
              // Allow current selection + any unselected option.
              return id === String(item.cosmeticId)
                || !item.cosmeticId
                || !options.some((other) => other.__selected);
            })
            .map((opt) => (
              <option key={getCosmeticId(opt) || opt.name} value={getCosmeticId(opt) || ''}>
                {getCosmeticName(opt)} (tồn: {getStockOf(opt)})
              </option>
            ))}
        </select>
      </div>
      <div className="therapist-rx-qty">
        <label htmlFor={`rx-qty-${item.id}`} className="input-label">Số lượng</label>
        <input
          id={`rx-qty-${item.id}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(maxQty, 1)}
          step={1}
          className="input"
          value={item.quantity}
          onChange={(e) => {
            const raw = e.target.value;
            const value = raw === '' ? '' : Number(raw);
            onChange(item.id, { quantity: value });
          }}
          disabled={!item.cosmeticId}
        />
        <span className="therapist-rx-stock">Tồn kho: {item.stock}</span>
      </div>
      <div className="therapist-rx-actions">
        <button
          type="button"
          className="therapist-rx-remove"
          aria-label="Xóa sản phẩm khỏi đơn"
          onClick={() => onRemove(item.id)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Xóa
        </button>
      </div>
    </div>
  );
}

function Treatment() {
  const { appointmentId } = useParams();
  const flash = useFlashMessage();

  const [appointment, setAppointment] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [appointmentError, setAppointmentError] = useState(null);

  const [cosmetics, setCosmetics] = useState([]);
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);
  const [cosmeticsError, setCosmeticsError] = useState(null);

  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [preservedOnError, setPreservedOnError] = useState(false);

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

  const loadHistory = useCallback(async (customerId) => {
    if (!customerId) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const list = await getCustomerTreatmentHistory(customerId);
      setHistory(list);
    } catch (err) {
      console.error('Error loading treatment history:', err);
      setHistoryError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải lịch sử trị liệu.'
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadCosmetics = useCallback(async () => {
    setCosmeticsLoading(true);
    setCosmeticsError(null);
    try {
      const list = await getPrescribableCosmetics();
      setCosmetics(list);
    } catch (err) {
      console.error('Error loading cosmetics:', err);
      setCosmeticsError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải danh sách mỹ phẩm.'
      );
    } finally {
      setCosmeticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointment();
    loadCosmetics();
  }, [loadAppointment, loadCosmetics]);

  const customerId = useMemo(() => {
    if (!appointment) return null;
    return appointment.customer?.id
      ?? appointment.customerId
      ?? appointment.customer?.userId
      ?? null;
  }, [appointment]);

  useEffect(() => {
    if (customerId) {
      loadHistory(customerId);
    } else {
      setHistory([]);
      setHistoryLoading(false);
    }
  }, [customerId, loadHistory]);

  // Build the option list with stock info. Mark already-selected items so the
  // <select> still allows them to remain in the prescription.
  const cosmeticOptions = useMemo(() => {
    return cosmetics.map((c) => {
      const id = getCosmeticId(c);
      const stock = getStockOf(c);
      const alreadySelected = prescription.some((p) => String(p.cosmeticId) === String(id));
      return {
        ...c,
        id,
        stock,
        __selected: alreadySelected,
      };
    });
  }, [cosmetics, prescription]);

  const addPrescriptionRow = () => {
    setPrescription((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cosmeticId: '',
        quantity: 1,
        stock: 0,
      },
    ]);
  };

  const updatePrescriptionRow = (rowId, patch) => {
    setPrescription((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const removePrescriptionRow = (rowId) => {
    setPrescription((prev) => prev.filter((row) => row.id !== rowId));
  };

  const prescriptionErrors = useMemo(() => {
    const errors = {};
    prescription.forEach((row) => {
      if (!row.cosmeticId) {
        errors[row.id] = 'Vui lòng chọn sản phẩm.';
        return;
      }
      if (row.stock <= 0) {
        errors[row.id] = 'Sản phẩm đã hết hàng trong kho.';
        return;
      }
      const qty = Number(row.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors[row.id] = 'Số lượng phải lớn hơn 0.';
      } else if (row.stock > 0 && qty > row.stock) {
        errors[row.id] = `Số lượng vượt quá tồn kho (${row.stock}).`;
      }
    });
    return errors;
  }, [prescription]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!appointment) return false;
    // Notes or outcome are encouraged; block empty prescriptions only.
    if (prescription.length === 0) return true; // optional to kê đơn
    return Object.keys(prescriptionErrors).length === 0;
  }, [submitting, appointment, prescription, prescriptionErrors]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setPreservedOnError(false);
    const payload = {
      notes: notes.trim(),
      outcome: outcome || null,
      prescription: prescription
        .filter((row) => row.cosmeticId)
        .map((row) => ({
          cosmeticId: row.cosmeticId,
          quantity: Number(row.quantity) || 0,
        })),
    };
    try {
      await saveTreatmentJournal(appointmentId, payload);
      flash.show('Đã lưu nhật ký & kê đơn thành công.');
      // Refresh history to reflect the new entry on success.
      if (customerId) {
        loadHistory(customerId);
      }
      // Reset form state but keep customer/appointment context.
      setNotes('');
      setOutcome('');
      setPrescription([]);
    } catch (err) {
      console.error('Error saving treatment journal:', err);
      const message = err.response?.data?.message
        || err.message
        || 'Không thể lưu nhật ký. Vui lòng thử lại.';
      setSubmitError(message);
      setPreservedOnError(true);
      // Preserve the form contents so the user can retry.
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
  const canEditJournal = appointment.status === APPOINTMENT_STATUS.IN_TREATMENT
    || appointment.status === APPOINTMENT_STATUS.COMPLETED;

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
              Thông tin nhật ký và đơn mỹ phẩm được giữ lại để bạn thử lại.
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
                Thời lượng: {formatDuration(duration)}
              </span>
            )}
          </div>
          <div className="booking-detail-row">
            <span className="booking-detail-label">Phòng</span>
            <span className="booking-detail-value">Phòng {getRoomName(appointment)}</span>
          </div>
        </div>
      </section>

      {/* Treatment history */}
      <section className="customer-card therapist-history" aria-label="Lịch sử trị liệu">
        <div className="customer-card-title">Lịch sử trị liệu của khách</div>
        {historyLoading ? (
          <LoadingState message="Đang tải lịch sử trị liệu..." />
        ) : historyError ? (
          <ErrorState message={historyError} onRetry={() => customerId && loadHistory(customerId)} />
        ) : history.length === 0 ? (
          <EmptyState
            title="Chưa có lịch sử trị liệu"
            description="Khách hàng chưa có buổi trị liệu nào trước đây."
          />
        ) : (
          <ul className="therapist-history-list">
            {history.map((entry, idx) => (
              <TreatmentHistoryItem key={entry.id ?? `${entry.date ?? ''}-${idx}`} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      {/* Current session journal + prescription */}
      <form className="customer-card therapist-journal" onSubmit={handleSubmit} noValidate>
        <div className="customer-card-title">
          Nhật ký buổi hiện tại
        </div>

        {!canEditJournal && (
          <div className="booking-alert booking-alert-warning" role="status">
            Ca đang ở trạng thái &ldquo;{statusLabel}&rdquo;. Bạn vẫn có thể ghi nhật ký, nhưng nên bắt đầu ca trước khi lưu.
          </div>
        )}

        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label htmlFor="journal-notes" className="input-label">Tình trạng / Ghi chú</label>
          <textarea
            id="journal-notes"
            className="input therapist-journal-textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mô tả tình trạng da, vùng điều trị, lực massage, phản ứng của khách..."
          />
        </div>

        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label htmlFor="journal-outcome" className="input-label">Đánh giá kết quả</label>
          <select
            id="journal-outcome"
            className="input select"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="">-- Chọn đánh giá --</option>
            {OUTCOME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Cosmetic prescription */}
        <div className="therapist-rx-section">
          <div className="customer-section-header">
            <h3 className="customer-section-title" style={{ fontSize: 'var(--text-lg)' }}>
              Kê đơn mỹ phẩm
            </h3>
            <button
              type="button"
              className="customer-section-link"
              onClick={addPrescriptionRow}
              disabled={cosmeticsLoading}
            >
              + Thêm sản phẩm
            </button>
          </div>

          {cosmeticsLoading ? (
            <LoadingState message="Đang tải danh sách mỹ phẩm..." />
          ) : cosmeticsError ? (
            <ErrorState message={cosmeticsError} onRetry={loadCosmetics} />
          ) : cosmetics.length === 0 ? (
            <p className="therapist-rx-empty">Hiện chưa có mỹ phẩm khả dụng để kê đơn.</p>
          ) : prescription.length === 0 ? (
            <p className="therapist-rx-empty">
              Chưa có sản phẩm nào trong đơn. Nhấn <strong>+ Thêm sản phẩm</strong> để bắt đầu.
            </p>
          ) : (
            <div className="therapist-rx-list">
              {prescription.map((row) => (
                <PrescriptionRow
                  key={row.id}
                  item={row}
                  onChange={updatePrescriptionRow}
                  onRemove={removePrescriptionRow}
                  cosmeticOptions={cosmeticOptions}
                />
              ))}
            </div>
          )}

          {Object.values(prescriptionErrors).filter(Boolean).map((msg, idx) => (
            <div key={idx} className="booking-alert booking-alert-warning" role="alert">
              {msg}
            </div>
          ))}
        </div>

        <div className="therapist-journal-actions">
          <Button
            type="submit"
            disabled={!canSubmit}
            loading={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu nhật ký & Kê đơn'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Treatment;
