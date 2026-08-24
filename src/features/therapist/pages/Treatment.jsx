import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getAppointmentById,
  saveTreatmentJournal,
  getTreatmentRecord,
  getCustomerTreatmentHistory,
  getPrescribableCosmetics,
  savePrescription,
  updateAppointmentStatus,
  rejectAppointment,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
} from '@/services/therapistService';
import {
  Button,
  LoadingState,
  ErrorState,
  StatusBadge,
  EmptyState,
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

const getCustomerId = (apt) =>
  apt?.customerId || apt?.customer?.id || null;

const newRowId = () => `rx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [cosmetics, setCosmetics] = useState([]);
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);

  const [rxRows, setRxRows] = useState([]);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [rxError, setRxError] = useState(null);

  // Approval flow (PENDING -> CONFIRMED). Mirrors the journal submit
  // pattern: a dedicated local error and a submitting flag prevent
  // double-clicks and give the user a clear failure message.
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveError, setApproveError] = useState(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState(null);

  const customerId = useMemo(() => getCustomerId(appointment), [appointment]);

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
      // 404 means no record yet — leave record null
      if (err.response?.status !== 404) {
        console.error('Error loading therapy record:', err);
      }
      setRecord(null);
    } finally {
      setRecordLoading(false);
    }
  }, [appointmentId]);

  const loadHistory = useCallback(async (custId) => {
    if (!custId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getCustomerTreatmentHistory(custId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading treatment history:', err);
      setHistoryError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải lịch sử trị liệu của khách.'
      );
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadCosmetics = useCallback(async () => {
    setCosmeticsLoading(true);
    try {
      const data = await getPrescribableCosmetics();
      const list = (Array.isArray(data) ? data : []).filter(
        (c) => c && c.isActive !== false
      );
      setCosmetics(list);
    } catch (err) {
      console.error('Error loading cosmetics:', err);
      setCosmetics([]);
    } finally {
      setCosmeticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointment();
    loadRecord();
    loadCosmetics();
  }, [loadAppointment, loadRecord, loadCosmetics]);

  useEffect(() => {
    if (customerId) {
      loadHistory(customerId);
    }
  }, [customerId, loadHistory]);

  const isCompleted = appointment?.status === APPOINTMENT_STATUS.COMPLETED;
  const isInProgress = appointment?.status === APPOINTMENT_STATUS.IN_PROGRESS;
  const isPending = appointment?.status === APPOINTMENT_STATUS.PENDING;
  const isCancelled = appointment?.status === APPOINTMENT_STATUS.CANCELLED;

  const handleApprove = async () => {
    if (!appointment || !isPending || approveSubmitting || rejectSubmitting) return;
    setApproveSubmitting(true);
    setApproveError(null);
    setRejectError(null);
    try {
      const updated = await updateAppointmentStatus(appointmentId, APPOINTMENT_STATUS.CONFIRMED);
      flash.show('Đã duyệt lịch hẹn. Ca đã sẵn sàng cho bạn xử lý tiếp.');
      setAppointment(updated);
    } catch (err) {
      console.error('Error approving appointment:', err);
      setApproveError(
        err.response?.data?.message
          || err.message
          || 'Không thể duyệt lịch hẹn. Vui lòng thử lại.'
      );
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!appointment || !isPending || approveSubmitting || rejectSubmitting) return;
    const confirmed = window.confirm(
      'Bạn chắc chắn muốn từ chối lịch hẹn này? Lịch sẽ chuyển sang trạng thái Đã hủy.'
    );
    if (!confirmed) return;
    setRejectSubmitting(true);
    setRejectError(null);
    setApproveError(null);
    try {
      const updated = await rejectAppointment(appointmentId);
      flash.show('Đã từ chối lịch hẹn. Khách hàng sẽ được thông báo.');
      setAppointment(updated);
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      setRejectError(
        err.response?.data?.message
          || err.message
          || 'Không thể từ chối lịch hẹn. Vui lòng thử lại.'
      );
    } finally {
      setRejectSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!appointment) return false;
    return true;
  }, [submitting, appointment]);

  const usedCosmeticIds = useMemo(
    () => new Set(rxRows.map((r) => r.cosmeticId).filter(Boolean)),
    [rxRows]
  );

  const availableCosmeticsForNewRow = useMemo(
    () => cosmetics.filter((c) => !usedCosmeticIds.has(c.id)),
    [cosmetics, usedCosmeticIds]
  );

  const handleAddRxRow = () => {
    const firstAvailable = availableCosmeticsForNewRow[0];
    setRxRows((rows) => [
      ...rows,
      {
        id: newRowId(),
        cosmeticId: firstAvailable?.id || '',
        quantity: 1,
      },
    ]);
  };

  const handleRemoveRxRow = (rowId) => {
    setRxRows((rows) => rows.filter((r) => r.id !== rowId));
  };

  const handleUpdateRxRow = (rowId, patch) => {
    setRxRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
    );
  };

  const validateRxRows = () => {
    for (const row of rxRows) {
      if (!row.cosmeticId) {
        return 'Vui lòng chọn mỹ phẩm cho từng dòng kê đơn.';
      }
      const qty = Number(row.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return 'Số lượng phải là số nguyên lớn hơn hoặc bằng 1.';
      }
      const cosmetic = cosmetics.find((c) => c.id === row.cosmeticId);
      if (cosmetic && typeof cosmetic.stockQuantity === 'number' && qty > cosmetic.stockQuantity) {
        return `Số lượng yêu cầu (${qty}) vượt quá tồn kho khả dụng (${cosmetic.stockQuantity}) của ${cosmetic.name}.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    setSubmitting(true);
    setRxSubmitting(true);
    setSubmitError(null);
    setRxError(null);
    setPreservedOnError(false);

    const payload = {
      conditionNotes: conditionNotes.trim() || null,
      improvementNotes: improvementNotes.trim() || null,
      remainingSessions: remainingSessions ? Number(remainingSessions) : null,
    };

    let recordSaved = false;
    let recordError = null;
    let prescriptionError = null;

        try {
      await saveTreatmentJournal(appointmentId, payload);
      recordSaved = true;
    } catch (err) {
      console.error('Error saving therapy record:', err);
      recordError = err.response?.data?.message
        || err.message
        || 'Không thể lưu hồ sơ trị liệu.';
    }

    if (recordSaved && rxRows.length > 0) {
      const validationError = validateRxRows();
      if (validationError) {
        prescriptionError = validationError;
      } else {
        try {
          const dedupedMap = new Map();
          for (const row of rxRows) {
            const existing = dedupedMap.get(row.cosmeticId) || 0;
            dedupedMap.set(row.cosmeticId, existing + Number(row.quantity));
          }
          const items = [...dedupedMap.entries()].map(([cosmeticId, quantity]) => ({
            cosmeticId,
            quantity,
            usageInstruction: null,
          }));

          await savePrescription({
            appointmentId,
            technicianId: appointment?.therapistId,
            note: improvementNotes?.trim() || null,
            items,
          });
        } catch (err) {
          console.error('Error saving prescription:', err);
          prescriptionError = err.response?.data?.message
            || err.message
            || 'Không thể lưu đơn kê mỹ phẩm.';
        }
      }
    }

    setSubmitting(false);
    setRxSubmitting(false);

    if (recordError) {
      setSubmitError(`Hồ sơ trị liệu: ${recordError}`);
      setPreservedOnError(true);
      return;
    }

    if (prescriptionError) {
      setRxError(`Đã lưu hồ sơ trị liệu nhưng đơn kê mỹ phẩm bị lỗi: ${prescriptionError}. Vui lòng kiểm tra và kê lại.`);
      return;
    }

    flash.show('Đã lưu hồ sơ trị liệu & hoàn thành ca.');
    setRxRows([]);
    setConditionNotes('');
    setImprovementNotes('');
    setRemainingSessions('');
    await loadRecord();
    await loadAppointment();
    if (customerId) {
      await loadHistory(customerId);
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

  const historyToShow = history.filter((h) => h.appointmentId !== appointmentId);
  const currentAppointmentHasRecord = Boolean(record && record.id);

  return (
    <div className="therapist-treatment">
      <Link to="/therapist/schedule" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại Điều trị &amp; kê đơn
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

      {rxError && (
        <div className="booking-alert booking-alert-error" role="alert">
          <strong>Kê đơn mỹ phẩm:</strong> {rxError}
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
            {customerId && (
              <span className="booking-detail-subvalue">Mã KH: {customerId}</span>
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

      {isPending && (
        <section className="customer-card therapist-approval" aria-label="Duyệt lịch hẹn">
          <div className="customer-card-title">Duyệt lịch hẹn</div>
          <div className="booking-alert booking-alert-info" role="status">
            Ca đang chờ bạn duyệt. Duyệt để xác nhận bạn sẽ phụ trách ca trị liệu này,
            sau đó mới có thể bắt đầu trị liệu và lưu hồ sơ.
          </div>

          {approveError && (
            <div className="booking-alert booking-alert-error" role="alert">
              <strong>Không thể duyệt:</strong> {approveError}
            </div>
          )}
          {rejectError && (
            <div className="booking-alert booking-alert-error" role="alert">
              <strong>Không thể từ chối:</strong> {rejectError}
            </div>
          )}

          <div className="therapist-approval-actions">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={approveSubmitting || rejectSubmitting}
              loading={approveSubmitting}
            >
              {approveSubmitting ? 'Đang duyệt...' : 'Duyệt lịch'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleReject}
              disabled={approveSubmitting || rejectSubmitting}
              loading={rejectSubmitting}
            >
              {rejectSubmitting ? 'Đang từ chối...' : 'Từ chối'}
            </Button>
          </div>
        </section>
      )}

      {isCancelled && (
        <section className="customer-card therapist-approval" aria-label="Lịch đã hủy">
          <div className="booking-alert booking-alert-error" role="status">
            Lịch hẹn này đã được hủy. Không thể tiếp tục trị liệu.
          </div>
        </section>
      )}

      {!isCompleted && !isPending && !isCancelled && (
        <form className="customer-card therapist-journal" onSubmit={handleSubmit} noValidate>
          <div className="customer-card-title">
            Hồ sơ trị liệu &amp; kê đơn
          </div>

          {!isInProgress && (
            <div className="booking-alert booking-alert-warning" role="status">
              Ca đang ở trạng thái &ldquo;{statusLabel}&rdquo;. Bạn nên bắt đầu ca trước khi lưu hồ sơ.
            </div>
          )}

          <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label htmlFor="condition-notes" className="input-label">Tình trạng / ghi chú ban đầu</label>
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
            <label htmlFor="improvement-notes" className="input-label">Kết quả điều trị / ghi chú sau trị liệu</label>
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
            <label htmlFor="remaining-sessions" className="input-label">Số buổi còn lại (tùy chọn)</label>
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

          <div className="therapist-rx-section">
            <div className="customer-card-title" style={{ marginBottom: 'var(--space-3)' }}>
              Kê đơn mỹ phẩm
            </div>

            {cosmeticsLoading ? (
              <div className="therapist-rx-empty">Đang tải danh sách mỹ phẩm...</div>
            ) : cosmetics.length === 0 ? (
              <div className="therapist-rx-empty">
                Không có mỹ phẩm nào đang bán trong hệ thống.
              </div>
            ) : rxRows.length === 0 ? (
              <div className="therapist-rx-empty">
                Bạn có thể kê đơn mỹ phẩm cho khách (tùy chọn). Bấm &ldquo;Thêm mỹ phẩm&rdquo; để bắt đầu.
              </div>
            ) : (
              <div className="therapist-rx-list">
                {rxRows.map((row) => {
                  const selected = cosmetics.find((c) => c.id === row.cosmeticId);
                  const stock = selected?.stockQuantity ?? null;
                  const qtyNum = Number(row.quantity);
                  const exceeds = stock !== null && Number.isInteger(qtyNum) && qtyNum > stock;
                  return (
                    <div key={row.id} className="therapist-rx-row">
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" htmlFor={`rx-cosmetic-${row.id}`}>
                          Mỹ phẩm
                        </label>
                        <select
                          id={`rx-cosmetic-${row.id}`}
                          className="input"
                          value={row.cosmeticId}
                          onChange={(e) => handleUpdateRxRow(row.id, { cosmeticId: e.target.value })}
                        >
                          <option value="">-- Chọn mỹ phẩm --</option>
                          {cosmetics.map((c) => {
                            const taken = usedCosmeticIds.has(c.id) && c.id !== row.cosmeticId;
                            const stockStr = typeof c.stockQuantity === 'number' ? ` (tồn: ${c.stockQuantity})` : '';
                            return (
                              <option key={c.id} value={c.id} disabled={taken}>
                                {c.name}{stockStr}{taken ? ' — đã chọn' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="therapist-rx-qty">
                        <label className="input-label" htmlFor={`rx-qty-${row.id}`}>Số lượng</label>
                        <input
                          id={`rx-qty-${row.id}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          className="input"
                          value={row.quantity}
                          onChange={(e) => handleUpdateRxRow(row.id, { quantity: e.target.value })}
                        />
                        {stock !== null && (
                          <span className="therapist-rx-stock">
                            Tồn kho: {stock}{exceeds ? ' — vượt quá!' : ''}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="therapist-rx-remove"
                        onClick={() => handleRemoveRxRow(row.id)}
                        aria-label="Xóa dòng kê đơn"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="therapist-rx-stock">
                Kho không bị trừ khi kê đơn — chỉ trừ khi thanh toán hóa đơn.
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddRxRow}
                disabled={availableCosmeticsForNewRow.length === 0}
              >
                + Thêm mỹ phẩm
              </Button>
            </div>
          </div>

          <div className="therapist-journal-actions">
            <Button
              type="submit"
              disabled={submitting}
              loading={submitting || rxSubmitting}
            >
              {submitting || rxSubmitting
                ? 'Đang lưu...'
                : 'Lưu & Kê đơn'}
            </Button>
          </div>
        </form>
      )}

      {isCompleted && currentAppointmentHasRecord && (
        <section className="customer-card therapist-journal">
          <div className="customer-card-title">
            Hồ sơ trị liệu (đã hoàn thành)
          </div>

          <div className="booking-detail-grid">
            <div className="booking-detail-row">
              <span className="booking-detail-label">Tình trạng</span>
              <span className="booking-detail-value">{record.conditionNotes || '—'}</span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">Kết quả / Cải thiện</span>
              <span className="booking-detail-value">{record.improvementNotes || '—'}</span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">Số buổi còn lại</span>
              <span className="booking-detail-value">{record.remainingSessions ?? '—'}</span>
            </div>
            <div className="booking-detail-row">
              <span className="booking-detail-label">Thời điểm ghi nhận</span>
              <span className="booking-detail-value">{formatDateTime(record.recordedAt)}</span>
            </div>
          </div>
        </section>
      )}

      {isCompleted && !currentAppointmentHasRecord && !recordLoading && (
        <section className="customer-card therapist-journal">
          <div className="booking-alert booking-alert-warning">
            Ca đã hoàn thành nhưng chưa tìm thấy hồ sơ trị liệu.
          </div>
        </section>
      )}

      <section className="customer-card therapist-history" aria-label="Lịch sử trị liệu khách hàng">
        <header className="booking-detail-header">
          <div>
            <div className="customer-card-title">Lịch sử trị liệu</div>
            <p className="therapist-appointment-code">
              Khách hàng: {getCustomerName(appointment)}
            </p>
          </div>
        </header>

        {historyLoading ? (
          <LoadingState message="Đang tải lịch sử trị liệu..." />
        ) : historyError ? (
          <ErrorState message={historyError} onRetry={() => loadHistory(customerId)} />
        ) : historyToShow.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Chưa có lịch sử trị liệu"
            description="Khách hàng này chưa có buổi trị liệu nào trước đây."
          />
        ) : (
          <ul className="therapist-history-list">
            {historyToShow.map((h) => (
              <li key={h.id} className="therapist-history-item">
                <div className="therapist-history-date">{formatDateTime(h.recordedAt)}</div>
                <div>
                  <div className="therapist-history-service">Ca #{h.appointmentId}</div>
                  <div className="therapist-history-notes">
                    <strong>Tình trạng:</strong> {h.conditionNotes || '—'}
                  </div>
                  <div className="therapist-history-notes">
                    <strong>Kết quả:</strong> {h.improvementNotes || '—'}
                  </div>
                  {h.remainingSessions !== null && h.remainingSessions !== undefined && (
                    <span className="therapist-history-outcome">
                      Còn {h.remainingSessions} buổi
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isInProgress && !isCompleted && !isPending && !isCancelled && (
        <div className="booking-alert booking-alert-info" role="status">
          Hãy bắt đầu ca trị liệu trước khi ghi hồ sơ.
        </div>
      )}
    </div>
  );
}

export default Treatment;
