import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
} from '@/components/common';
import { formatCurrency } from '@/utils/formatters';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import {
  createInvoiceFromAppointment,
  createRetailInvoice,
  extractApiError,
  getAdminAppointmentById,
  getAdminAppointments,
  getCosmeticsAdmin,
  getCustomers,
  getInvoiceById,
  getInvoices,
  payInvoice,
} from '@/services/adminService';

// =========================================================
// Constants
// =========================================================
const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ thanh toán' },
  { id: 'paid', label: 'Đã thanh toán' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt', hint: 'Khách thanh toán tại quầy' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản', hint: 'Chuyển khoản ngân hàng' },
];

// =========================================================
// Helpers
// =========================================================
const pickString = (...vals) => {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return '';
};

const pickNumber = (...vals) => {
  for (const v of vals) {
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDate = (value) => {
  const d = parseDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (value) => {
  const d = parseDate(value);
  if (!d) return '-';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const normaliseInvoice = (inv) => {
  const id = inv.id ?? inv._id;
  const statusRaw = pickString(inv.status, 'PENDING').toUpperCase();
  const typeRaw = pickString(inv.type, inv.invoiceType, 'APPOINTMENT').toUpperCase();
  return {
    id,
    code: pickString(inv.code, inv.invoiceCode, inv.invoiceNumber, id ? `INV-${id}` : '—'),
    customerId: inv.customerId ?? inv.customer?.id ?? inv.customer?._id,
    customerName: pickString(
      inv.customerName,
      inv.customer?.name,
      inv.customer?.fullName,
      inv.appointment?.customer?.name,
      'Khách lẻ',
    ),
    customerPhone: pickString(
      inv.customerPhone,
      inv.customer?.phone,
      inv.customer?.phoneNumber,
      inv.appointment?.customer?.phone,
    ),
    appointmentId: inv.appointmentId ?? inv.appointment?.id ?? inv.appointment?._id,
    type: typeRaw,
    status: statusRaw,
    createdAt: inv.createdAt || inv.issuedAt || inv.date,
    paidAt: inv.paidAt || inv.payment?.paidAt,
    paymentMethod: pickString(inv.paymentMethod, inv.payment?.method, '').toUpperCase(),
    serviceAmount: pickNumber(inv.serviceAmount, inv.serviceTotal),
    roomAmount: pickNumber(inv.roomAmount, inv.roomTotal),
    cosmeticAmount: pickNumber(inv.cosmeticAmount, inv.productAmount, inv.itemsAmount),
    total: pickNumber(inv.totalAmount, inv.total, inv.amount, 0) ?? 0,
    items: Array.isArray(inv.items) ? inv.items.map(normaliseLine) : [],
    raw: inv,
  };
};

const normaliseLine = (item) => ({
  id: item.id ?? item._id,
  name: pickString(item.name, item.serviceName, item.cosmeticName, item.productName, 'Sản phẩm'),
  type: pickString(item.type, item.kind, 'SERVICE').toUpperCase(),
  quantity: pickNumber(item.quantity, item.qty, 1) ?? 1,
  unitPrice: pickNumber(item.unitPrice, item.price, 0) ?? 0,
  total: pickNumber(item.total, item.amount, 0) ?? 0,
});

const getStatusInfo = (status) => {
  switch (status) {
    case 'PAID':
      return { variant: 'success', label: 'Đã thanh toán' };
    case 'CANCELLED':
      return { variant: 'neutral', label: 'Đã hủy' };
    case 'REFUNDED':
      return { variant: 'info', label: 'Đã hoàn tiền' };
    case 'FAILED':
      return { variant: 'error', label: 'Thanh toán thất bại' };
    case 'PENDING':
    case 'UNPAID':
    default:
      return { variant: 'warning', label: 'Chờ thanh toán' };
  }
};

const getPaymentLabel = (method) => {
  switch (method) {
    case 'CASH': return 'Tiền mặt';
    case 'BANK_TRANSFER': return 'Chuyển khoản';
    default: return method || '-';
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'RETAIL':
    case 'COSMETIC':
      return 'Bán lẻ mỹ phẩm';
    case 'APPOINTMENT':
    default:
      return 'Theo lịch hẹn';
  }
};

// =========================================================
// Payment modal: pick method, then trigger confirm.
// =========================================================
function PaymentModal({ isOpen, invoice, method, onMethodChange, onClose, onProceed }) {
  if (!isOpen || !invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thanh toán - ${invoice.code}`}
      size="md"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={onProceed}>Tiếp tục</Button>
        </>
      )}
    >
      <div className="admin-form">
        <div className="admin-confirm-grid">
          <div className="admin-confirm-grid-row">
            <span>Mã hóa đơn</span>
            <strong>{invoice.code}</strong>
          </div>
          <div className="admin-confirm-grid-row">
            <span>Khách hàng</span>
            <strong>{invoice.customerName}</strong>
          </div>
          <div className="admin-confirm-grid-row admin-confirm-grid-row--total">
            <span>Tổng thanh toán</span>
            <strong>{formatCurrency(invoice.total)}</strong>
          </div>
        </div>

        <div>
          <label className="input-label">Phương thức thanh toán</label>
          <div className="admin-payment-method" role="radiogroup" aria-label="Phương thức thanh toán">
            {PAYMENT_METHODS.map((opt) => (
              <label
                key={opt.value}
                className={`admin-method-option${method === opt.value ? ' admin-method-option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={opt.value}
                  checked={method === opt.value}
                  onChange={() => onMethodChange(opt.value)}
                />
                <span className="admin-method-option-text">
                  <span className="admin-method-option-title">{opt.label}</span>
                  <span className="admin-method-option-hint">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================
// ConfirmDialog wrapper that previews invoice + total
// =========================================================
function PaymentConfirmDialog({ target, method, onClose, onConfirm, loading }) {
  if (!target) return null;
  return (
    <ConfirmDialog
      isOpen={!!target}
      onClose={loading ? () => {} : onClose}
      onConfirm={onConfirm}
      title="Xác nhận thanh toán"
      message={
        <span>
          Xác nhận thanh toán hóa đơn <strong>{target.code}</strong>{' '}
          với số tiền <strong>{formatCurrency(target.total)}</strong> bằng{' '}
          <strong>{getPaymentLabel(method)}</strong>?
        </span>
      }
      confirmText="Xác nhận thanh toán"
      variant="primary"
      loading={loading}
    />
  );
}

// =========================================================
// Invoice detail modal
// =========================================================
function InvoiceDetailModal({ isOpen, invoiceId, onClose, onPay }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setInvoice(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getInvoiceById(invoiceId)
      .then((data) => {
        if (data) setInvoice(normaliseInvoice(data));
        else setError('Không tìm thấy hóa đơn.');
      })
      .catch((err) => {
        setError(extractApiError(err, 'Không thể tải chi tiết hóa đơn.'));
      })
      .finally(() => setLoading(false));
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const status = invoice ? getStatusInfo(invoice.status) : null;
  const canPay = invoice && (invoice.status === 'PENDING' || invoice.status === 'UNPAID' || invoice.status === 'FAILED');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? `Chi tiết hóa đơn ${invoice.code}` : 'Chi tiết hóa đơn'}
      size="lg"
    >
      {loading && <LoadingState message="Đang tải chi tiết hóa đơn..." />}
      {!loading && error && (
        <div className="admin-banner admin-banner--error" role="alert">
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && invoice && (
        <div className="admin-form">
          <div className="admin-confirm-grid">
            <div className="admin-confirm-grid-row">
              <span>Mã hóa đơn</span>
              <strong>{invoice.code}</strong>
            </div>
            <div className="admin-confirm-grid-row">
              <span>Khách hàng</span>
              <strong>{invoice.customerName}</strong>
            </div>
            {invoice.customerPhone && (
              <div className="admin-confirm-grid-row">
                <span>Số điện thoại</span>
                <strong>{invoice.customerPhone}</strong>
              </div>
            )}
            <div className="admin-confirm-grid-row">
              <span>Loại hóa đơn</span>
              <strong>{getTypeLabel(invoice.type)}</strong>
            </div>
            {invoice.appointmentId && (
              <div className="admin-confirm-grid-row">
                <span>Mã lịch hẹn</span>
                <strong>#{invoice.appointmentId}</strong>
              </div>
            )}
            <div className="admin-confirm-grid-row">
              <span>Ngày tạo</span>
              <strong>{formatDateTime(invoice.createdAt)}</strong>
            </div>
            <div className="admin-confirm-grid-row">
              <span>Trạng thái</span>
              <span><StatusBadge variant={status.variant}>{status.label}</StatusBadge></span>
            </div>
            {invoice.paidAt && (
              <div className="admin-confirm-grid-row">
                <span>Ngày thanh toán</span>
                <strong>{formatDateTime(invoice.paidAt)}</strong>
              </div>
            )}
            {invoice.paymentMethod && (
              <div className="admin-confirm-grid-row">
                <span>Phương thức</span>
                <strong>{getPaymentLabel(invoice.paymentMethod)}</strong>
              </div>
            )}
          </div>

          <div>
            <div className="admin-detail-section-title">Danh sách sản phẩm / dịch vụ</div>
            {invoice.items.length === 0 ? (
              <p style={{ color: 'var(--color-charcoal-muted)', margin: 0 }}>
                Hóa đơn chưa có dòng sản phẩm nào.
              </p>
            ) : (
              <div className="admin-line-items">
                {invoice.items.map((item) => (
                  <div className="admin-line-item" key={item.id || item.name}>
                    <div className="admin-line-item-info">
                      <div className="admin-line-item-name">{item.name}</div>
                      <div className="admin-line-item-meta">
                        {item.type === 'COSMETIC' ? 'Mỹ phẩm' : 'Dịch vụ'} - SL {item.quantity} - {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div className="admin-line-item-total">{formatCurrency(item.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-summary">
            {invoice.serviceAmount !== null && (
              <div className="admin-summary-row">
                <span>Tiền dịch vụ</span>
                <span>{formatCurrency(invoice.serviceAmount)}</span>
              </div>
            )}
            {invoice.roomAmount !== null && (
              <div className="admin-summary-row">
                <span>Tiền phòng</span>
                <span>{formatCurrency(invoice.roomAmount)}</span>
              </div>
            )}
            {invoice.cosmeticAmount !== null && (
              <div className="admin-summary-row">
                <span>Tiền mỹ phẩm</span>
                <span>{formatCurrency(invoice.cosmeticAmount)}</span>
              </div>
            )}
            <div className="admin-summary-row admin-summary-row--total">
              <span>Tổng thanh toán</span>
              <strong>{formatCurrency(invoice.total)}</strong>
            </div>
          </div>

          {canPay && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button onClick={() => onPay(invoice)}>Thanh toán</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// =========================================================
// Create invoice: appointment flow (Flow 1)
// =========================================================
function AppointmentInvoiceModal({ isOpen, onClose, onCreated }) {
  const [appointments, setAppointments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingList(true);
    setListError(null);
    setSelected(null);
    setDetail(null);
    setDetailError(null);
    setGlobalError(null);
    getAdminAppointments({ status: 'COMPLETED' })
      .then((list) => setAppointments(Array.isArray(list) ? list : []))
      .catch((err) => setListError(extractApiError(err, 'Không thể tải lịch hẹn.')))
      .finally(() => setLoadingList(false));
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((a) => {
      const customer = a.customer?.name || a.customerName || '';
      const therapist = a.therapist?.name || a.therapistName || '';
      const service = a.service?.name || a.serviceName || '';
      return (
        customer.toLowerCase().includes(q)
        || therapist.toLowerCase().includes(q)
        || service.toLowerCase().includes(q)
        || String(a.id ?? a._id ?? '').toLowerCase().includes(q)
      );
    });
  }, [appointments, debouncedSearch]);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getAdminAppointmentById(id);
      setDetail(data);
    } catch (err) {
      setDetailError(extractApiError(err, 'Không thể tải chi tiết lịch hẹn.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelect = (apt) => {
    const id = apt.id ?? apt._id;
    setSelected(apt);
    if (id) loadDetail(id);
  };

  const handleCreate = async () => {
    if (!selected) return;
    const id = selected.id ?? selected._id;
    if (!id) {
      setGlobalError('Không xác định được mã lịch hẹn.');
      return;
    }
    setSubmitting(true);
    setGlobalError(null);
    try {
      const saved = await createInvoiceFromAppointment(id);
      onCreated?.(saved);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể tạo hóa đơn.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Tạo hóa đơn từ lịch hẹn"
      size="lg"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            disabled={!selected}
          >
            Tạo hóa đơn
          </Button>
        </>
      )}
    >
      <div className="admin-form">
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <Input
          label="Tìm lịch hẹn đã hoàn thành"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Khách hàng, dịch vụ, KTV..."
        />

        <div>
          <div className="admin-detail-section-title">Lịch hẹn đã hoàn thành</div>
          {loadingList ? (
            <LoadingState message="Đang tải lịch hẹn..." />
          ) : listError ? (
            <div className="admin-banner admin-banner--error" role="alert">
              <span>{listError}</span>
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Không có lịch hẹn đã hoàn thành phù hợp.
            </p>
          ) : (
            <div className="admin-pick-list" role="listbox">
              {filtered.map((apt) => {
                const id = apt.id ?? apt._id;
                const customer = apt.customer?.name || apt.customerName || 'Khách hàng';
                const service = apt.service?.name || apt.serviceName || 'Dịch vụ';
                const therapist = apt.therapist?.name || apt.therapistName || 'KTV';
                const isActive = selected && (selected.id ?? selected._id) === id;
                return (
                  <button
                    type="button"
                    key={id}
                    className={`admin-pick-item${isActive ? ' admin-pick-item--active' : ''}`}
                    onClick={() => handleSelect(apt)}
                    role="option"
                    aria-selected={isActive}
                  >
                    <div className="admin-pick-item-text">
                      <div className="admin-pick-item-title">{customer} - {service}</div>
                      <div className="admin-pick-item-sub">
                        KTV: {therapist}
                        {apt.room?.name ? ` - Phòng: ${apt.room.name}` : ''}
                        {apt.startTime ? ` - ${formatDate(apt.startTime)}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)' }}>
                      #{id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div>
            <div className="admin-detail-section-title">Chi tiết lịch hẹn</div>
            {detailLoading ? (
              <LoadingState message="Đang tải chi tiết..." />
            ) : detailError ? (
              <div className="admin-banner admin-banner--error" role="alert">
                <span>{detailError}</span>
              </div>
            ) : (
              <div className="admin-confirm-grid">
                <div className="admin-confirm-grid-row">
                  <span>Khách hàng</span>
                  <strong>
                    {detail?.customer?.name || selected.customer?.name || selected.customerName || '—'}
                  </strong>
                </div>
                <div className="admin-confirm-grid-row">
                  <span>Dịch vụ</span>
                  <strong>
                    {detail?.service?.name || selected.service?.name || selected.serviceName || '—'}
                  </strong>
                </div>
                <div className="admin-confirm-grid-row">
                  <span>Phòng</span>
                  <strong>
                    {detail?.room?.name || selected.room?.name || selected.roomName || '—'}
                  </strong>
                </div>
                <div className="admin-confirm-grid-row">
                  <span>Kỹ thuật viên</span>
                  <strong>
                    {detail?.therapist?.name || selected.therapist?.name || selected.therapistName || '—'}
                  </strong>
                </div>
                {(detail?.totalAmount || detail?.total) !== undefined && (
                  <div className="admin-confirm-grid-row admin-confirm-grid-row--total">
                    <span>Tổng dự kiến (từ backend)</span>
                    <strong>
                      {formatCurrency(pickNumber(detail?.totalAmount, detail?.total) ?? 0)}
                    </strong>
                  </div>
                )}
              </div>
            )}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Tổng tiền sẽ do backend tính và trả về sau khi tạo hóa đơn.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// =========================================================
// Create invoice: retail cosmetic flow (Flow 2)
// =========================================================
function RetailInvoiceModal({ isOpen, onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerRequired, setCustomerRequired] = useState(false);

  const [cosmetics, setCosmetics] = useState([]);
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]); // [{ cosmeticId, name, price, stock, quantity }]

  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId('');
    setLines([]);
    setSearch('');
    setGlobalError(null);

    // Load cosmetics first - the page may or may not allow customer selection.
    setCosmeticsLoading(true);
    getCosmeticsAdmin()
      .then((list) => setCosmetics(Array.isArray(list) ? list : []))
      .catch((err) => setGlobalError(extractApiError(err, 'Không thể tải danh sách mỹ phẩm.')))
      .finally(() => setCosmeticsLoading(false));

    // Try to load customers - the customer requirement is data-driven.
    setCustomersLoading(true);
    getCustomers()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCustomers(arr);
        // If backend returns no customers, fall back to walk-in sale.
        setCustomerRequired(arr.length > 0);
      })
      .catch(() => {
        // Customer endpoint missing - assume walk-in sale is allowed.
        setCustomerRequired(false);
      })
      .finally(() => setCustomersLoading(false));
  }, [isOpen]);

  const filteredCosmetics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cosmetics;
    return cosmetics.filter((c) =>
      (c.name || '').toLowerCase().includes(q)
      || (c.brand || '').toLowerCase().includes(q),
    );
  }, [cosmetics, search]);

  const addLine = (cosmetic) => {
    const id = cosmetic.id ?? cosmetic._id;
    if (!id) return;
    const stock = pickNumber(cosmetic.stock, cosmetic.quantity, 0) ?? 0;
    setLines((prev) => {
      const existing = prev.find((l) => l.cosmeticId === id);
      if (existing) {
        return prev.map((l) =>
          l.cosmeticId === id
            ? { ...l, quantity: Math.min(stock, l.quantity + 1) }
            : l,
        );
      }
      return [
        ...prev,
        {
          cosmeticId: id,
          name: cosmetic.name,
          price: pickNumber(cosmetic.price, 0) ?? 0,
          stock,
          quantity: 1,
        },
      ];
    });
  };

  const updateLine = (cosmeticId, patch) => {
    setLines((prev) => prev.map((l) => (l.cosmeticId === cosmeticId ? { ...l, ...patch } : l)));
  };

  const removeLine = (cosmeticId) => {
    setLines((prev) => prev.filter((l) => l.cosmeticId !== cosmeticId));
  };

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines],
  );

  const hasStockIssue = useMemo(
    () => lines.some((l) => l.quantity > l.stock),
    [lines],
  );

  const canSubmit = lines.length > 0
    && !hasStockIssue
    && (!customerRequired || !!customerId);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        type: 'RETAIL',
        customerId: customerId || undefined,
        items: lines.map((l) => ({
          cosmeticId: l.cosmeticId,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
      };
      const saved = await createRetailInvoice(payload);
      onCreated?.(saved);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể tạo hóa đơn bán lẻ.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Tạo hóa đơn bán lẻ mỹ phẩm"
      size="lg"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Tạo hóa đơn
          </Button>
        </>
      )}
    >
      <div className="admin-form">
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}

        <Select
          label={customerRequired ? 'Khách hàng' : 'Khách hàng (không bắt buộc)'}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customers.map((c) => ({
            value: c.id ?? c._id,
            label: c.name || c.fullName || c.email || `Khách #${c.id ?? c._id}`,
          }))}
          placeholder={customersLoading ? 'Đang tải...' : (customerRequired ? 'Chọn khách hàng' : 'Khách lẻ')}
        />

        <Input
          label="Tìm mỹ phẩm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tên hoặc thương hiệu..."
        />

        <div>
          <div className="admin-detail-section-title">Mỹ phẩm có sẵn</div>
          {cosmeticsLoading ? (
            <LoadingState message="Đang tải mỹ phẩm..." />
          ) : filteredCosmetics.length === 0 ? (
            <p style={{ color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Không tìm thấy mỹ phẩm phù hợp.
            </p>
          ) : (
            <div className="admin-pick-list">
              {filteredCosmetics.slice(0, 50).map((c) => {
                const id = c.id ?? c._id;
                const stock = pickNumber(c.stock, c.quantity, 0) ?? 0;
                const line = lines.find((l) => l.cosmeticId === id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`admin-pick-item${line ? ' admin-pick-item--active' : ''}`}
                    onClick={() => addLine(c)}
                    disabled={stock <= 0}
                  >
                    <div className="admin-pick-item-text">
                      <div className="admin-pick-item-title">{c.name}</div>
                      <div className="admin-pick-item-sub">
                        {formatCurrency(pickNumber(c.price, 0) ?? 0)} - Tồn: {stock}
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)' }}>
                      {stock <= 0 ? 'Hết hàng' : '+ Thêm'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="admin-detail-section-title">Danh sách sản phẩm</div>
          {lines.length === 0 ? (
            <p style={{ color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Chưa chọn sản phẩm nào.
            </p>
          ) : (
            <div className="admin-line-items">
              {lines.map((line) => {
                const overStock = line.quantity > line.stock;
                return (
                  <div className="admin-line-item" key={line.cosmeticId}>
                    <div className="admin-line-item-info">
                      <div className="admin-line-item-name">{line.name}</div>
                      <div className="admin-line-item-meta">
                        Tồn: {line.stock} - Đơn giá: {formatCurrency(line.price)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        <button
                          type="button"
                          className="admin-table-action-btn"
                          onClick={() => updateLine(line.cosmeticId, { quantity: Math.max(1, line.quantity - 1) })}
                          disabled={line.quantity <= 1}
                          aria-label="Giảm số lượng"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className="input"
                          style={{ width: '80px', padding: 'var(--space-2)' }}
                          min="1"
                          max={line.stock}
                          value={line.quantity}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateLine(line.cosmeticId, { quantity: Number.isNaN(v) ? 1 : Math.max(1, v) });
                          }}
                        />
                        <button
                          type="button"
                          className="admin-table-action-btn"
                          onClick={() => updateLine(line.cosmeticId, { quantity: Math.min(line.stock, line.quantity + 1) })}
                          disabled={line.quantity >= line.stock}
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                        {overStock && (
                          <span className="admin-inline-error">
                            Số lượng tồn kho không đủ.
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                      <div className="admin-line-item-total">
                        {formatCurrency(line.price * line.quantity)}
                      </div>
                      <button
                        type="button"
                        className="admin-line-item-remove"
                        onClick={() => removeLine(line.cosmeticId)}
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-summary">
          <div className="admin-summary-row">
            <span>Tiền mỹ phẩm</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="admin-summary-row admin-summary-row--total">
            <span>Tổng thanh toán</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        {hasStockIssue && (
          <div className="admin-banner admin-banner--error" role="alert">
            <span>Số lượng tồn kho không đủ. Vui lòng điều chỉnh trước khi tạo hóa đơn.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// =========================================================
// Page
// =========================================================
function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState('all');

  const [detailId, setDetailId] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const [createFlow, setCreateFlow] = useState(null); // 'appointment' | 'retail' | null
  const [banner, setBanner] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getInvoices();
      setInvoices(list.map(normaliseInvoice));
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải danh sách hóa đơn.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter === 'pending' && inv.status !== 'PENDING' && inv.status !== 'UNPAID') return false;
      if (statusFilter === 'paid' && inv.status !== 'PAID') return false;
      if (q) {
        const target = `${inv.code} ${inv.customerName} ${inv.customerPhone}`.toLowerCase();
        if (!target.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, debouncedSearch, statusFilter]);

  const totals = useMemo(() => {
    let pending = 0;
    let paid = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'PENDING' || inv.status === 'UNPAID') pending += 1;
      if (inv.status === 'PAID') paid += 1;
    });
    return { pending, paid };
  }, [invoices]);

  const openPayment = (invoice) => {
    setDetailId(null);
    setPaymentTarget(invoice);
    setPaymentMethod('CASH');
    setShowPaymentConfirm(false);
    setPaymentError(null);
  };

  const closePaymentModal = () => {
    if (submittingPayment) return;
    setPaymentTarget(null);
    setShowPaymentConfirm(false);
    setPaymentError(null);
  };

  const performPayment = async () => {
    if (!paymentTarget) return;
    setSubmittingPayment(true);
    setPaymentError(null);
    try {
      const saved = await payInvoice(paymentTarget.id, paymentMethod);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === paymentTarget.id
          ? normaliseInvoice(saved && typeof saved === 'object'
              ? saved
              : { ...inv.raw, status: 'PAID', paidAt: new Date().toISOString(), paymentMethod })
          : inv)),
      );
      setPaymentTarget(null);
      setShowPaymentConfirm(false);
      setBanner({ type: 'success', text: `Đã thanh toán hóa đơn ${paymentTarget.code}.` });
      // Backend deducts stock on payment - refresh inventory if we visit it next.
      load();
    } catch (err) {
      setPaymentError(extractApiError(err, 'Không thể xác nhận thanh toán.'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCreated = (saved) => {
    setCreateFlow(null);
    if (saved && typeof saved === 'object') {
      const normalised = normaliseInvoice(saved);
      setInvoices((prev) => {
        const exists = prev.find((inv) => inv.id === normalised.id);
        if (exists) {
          return prev.map((inv) => (inv.id === normalised.id ? { ...inv, ...normalised } : inv));
        }
        return [normalised, ...prev];
      });
      setBanner({ type: 'success', text: `Đã tạo hóa đơn ${normalised.code}.` });
    } else {
      setBanner({ type: 'success', text: 'Đã tạo hóa đơn.' });
    }
    load();
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Hóa đơn & thanh toán" description="Quản lý hóa đơn dịch vụ và bán lẻ" />
        <LoadingState message="Đang tải hóa đơn..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Hóa đơn & thanh toán" description="Quản lý hóa đơn dịch vụ và bán lẻ" />
        <ErrorState title="Không tải được hóa đơn" message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Hóa đơn & thanh toán"
        description="Quản lý hóa đơn dịch vụ spa và bán lẻ mỹ phẩm"
        actions={(
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setCreateFlow('appointment')}>
              + Từ lịch hẹn
            </Button>
            <Button onClick={() => setCreateFlow('retail')}>
              + Bán lẻ mỹ phẩm
            </Button>
          </div>
        )}
      />

      {banner && (
        <div className={`admin-banner admin-banner--${banner.type}`} role="status">
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Đóng">×</button>
        </div>
      )}

      {globalError && (
        <div className="admin-banner admin-banner--error" role="alert">
          <span>{globalError}</span>
          <button type="button" onClick={() => setGlobalError(null)} aria-label="Đóng">×</button>
        </div>
      )}

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">Tổng hóa đơn</span>
          <span className="admin-kpi-value">{invoices.length}</span>
          <span className="admin-kpi-hint">Tất cả trạng thái</span>
        </div>
        <div className="admin-kpi-card admin-kpi-card--warning">
          <span className="admin-kpi-label">Chờ thanh toán</span>
          <span className="admin-kpi-value">{totals.pending}</span>
          <span className="admin-kpi-hint">Cần xử lý</span>
        </div>
        <div className="admin-kpi-card admin-kpi-card--success">
          <span className="admin-kpi-label">Đã thanh toán</span>
          <span className="admin-kpi-value">{totals.paid}</span>
          <span className="admin-kpi-hint">Hoàn tất</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <span className="admin-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã hóa đơn, khách hàng..."
            aria-label="Tìm hóa đơn"
          />
        </div>
        <span className="admin-toolbar-spacer" />
        <div className="admin-filter-bar" role="group" aria-label="Lọc trạng thái">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`admin-chip${statusFilter === f.id ? ' admin-chip--active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filtered.length}/{invoices.length} hóa đơn
        </span>
      </div>

      <div className="card admin-table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Không có kết quả' : 'Chưa có hóa đơn'}
            description={
              search
                ? 'Thử từ khoá khác hoặc xoá bộ lọc.'
                : 'Bắt đầu bằng cách tạo hóa đơn từ lịch hẹn hoặc bán lẻ mỹ phẩm.'
            }
            action={!search ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="secondary" onClick={() => setCreateFlow('appointment')}>
                  + Từ lịch hẹn
                </Button>
                <Button onClick={() => setCreateFlow('retail')}>
                  + Bán lẻ mỹ phẩm
                </Button>
              </div>
            ) : null}
          />
        ) : (
          <>
            <table className="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Khách hàng</th>
                  <th>Loại</th>
                  <th>Ngày tạo</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = getStatusInfo(inv.status);
                  const canPay = inv.status === 'PENDING' || inv.status === 'UNPAID';
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div className="admin-table-name">{inv.code}</div>
                        {inv.appointmentId && (
                          <div className="admin-table-sub">Lịch hẹn #{inv.appointmentId}</div>
                        )}
                      </td>
                      <td>{inv.customerName}</td>
                      <td>{getTypeLabel(inv.type)}</td>
                      <td>{formatDate(inv.createdAt)}</td>
                      <td><strong>{formatCurrency(inv.total)}</strong></td>
                      <td>
                        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                        {inv.paymentMethod && (
                          <div className="admin-table-sub" style={{ marginTop: 4 }}>
                            {getPaymentLabel(inv.paymentMethod)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-table-action-btn"
                            onClick={() => setDetailId(inv.id)}
                          >
                            Chi tiết
                          </button>
                          {canPay && (
                            <button
                              type="button"
                              className="admin-table-action-btn"
                              onClick={() => openPayment(inv)}
                            >
                              Thanh toán
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="admin-table-cards">
              {filtered.map((inv) => {
                const status = getStatusInfo(inv.status);
                const canPay = inv.status === 'PENDING' || inv.status === 'UNPAID';
                return (
                  <div className="admin-table-card-row" key={`m-${inv.id}`}>
                    <div className="admin-table-card-row-top">
                      <div>
                        <div className="admin-table-card-row-title">{inv.code}</div>
                        <div className="admin-table-card-row-sub">
                          {inv.customerName}
                          {inv.customerPhone ? ` - ${inv.customerPhone}` : ''}
                        </div>
                      </div>
                      <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                    </div>
                    <div className="admin-table-card-row-meta">
                      <span>Loại: {getTypeLabel(inv.type)}</span>
                      <span>Ngày: {formatDate(inv.createdAt)}</span>
                    </div>
                    <div className="admin-line-item-total" style={{ fontSize: 'var(--text-base)' }}>
                      Tổng: {formatCurrency(inv.total)}
                    </div>
                    <div className="admin-table-card-row-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => setDetailId(inv.id)}
                      >
                        Chi tiết
                      </button>
                      {canPay && (
                        <button
                          type="button"
                          className="admin-table-action-btn"
                          onClick={() => openPayment(inv)}
                        >
                          Thanh toán
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <InvoiceDetailModal
        isOpen={!!detailId}
        invoiceId={detailId}
        onClose={() => setDetailId(null)}
        onPay={openPayment}
      />

      <PaymentModal
        isOpen={!!paymentTarget}
        invoice={paymentTarget}
        method={paymentMethod}
        onMethodChange={setPaymentMethod}
        onClose={closePaymentModal}
        onProceed={() => {
          // Closing the picker triggers the ConfirmDialog render path.
          setPaymentTarget(null);
          setTimeout(() => setShowPaymentConfirm(true), 50);
        }}
      />

      <PaymentConfirmDialog
        target={showPaymentConfirm ? paymentTarget : null}
        method={paymentMethod}
        onClose={() => {
          setShowPaymentConfirm(false);
          setPaymentError(null);
        }}
        onConfirm={performPayment}
        loading={submittingPayment}
      />

      {paymentError && (
        <div className="admin-banner admin-banner--error" role="alert" style={{ position: 'fixed', bottom: 24, right: 24 }}>
          <span>{paymentError}</span>
          <button type="button" onClick={() => setPaymentError(null)} aria-label="Đóng">×</button>
        </div>
      )}

      {createFlow === 'appointment' && (
        <AppointmentInvoiceModal
          isOpen
          onClose={() => setCreateFlow(null)}
          onCreated={handleCreated}
        />
      )}
      {createFlow === 'retail' && (
        <RetailInvoiceModal
          isOpen
          onClose={() => setCreateFlow(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

export default AdminInvoices;
