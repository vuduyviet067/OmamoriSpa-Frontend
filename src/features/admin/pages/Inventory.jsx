import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/common';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import {
  extractApiError,
  getInventory,
  getInventoryLots,
  stockInInventory,
  updateInventoryLot,
} from '@/services/adminService';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tất cả kho' },
  { id: 'low', label: 'Sắp hết' },
  { id: 'out', label: 'Hết hàng' },
  { id: 'in_stock', label: 'Còn hàng' },
];

const pickNumber = (...vals) => {
  for (const v of vals) {
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

const pickString = (...vals) => {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return '';
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
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const daysUntil = (value) => {
  const d = parseDate(value);
  if (!d) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// Backend payload shapes are inconsistent across versions - normalise here so
// the rest of the page is dumb.
const normaliseInventoryRow = (row) => {
  const cosmetic = row.cosmetic || {};
  const stock = pickNumber(row.stock, row.quantity, row.totalQuantity, row.totalStock);
  const minStock = pickNumber(
    row.minStock,
    row.minimumStock,
    row.threshold,
    row.lowStockThreshold,
    cosmetic.minStock,
  );
  const sku = pickString(row.sku, row.code, cosmetic.sku, cosmetic.code);
  const id = row.id ?? row._id ?? cosmetic.id ?? cosmetic._id;
  return {
    id,
    cosmeticId: row.cosmeticId ?? cosmetic.id ?? cosmetic._id,
    sku,
    name: pickString(row.name, cosmetic.name, 'Sản phẩm'),
    brand: pickString(row.brand, cosmetic.brand),
    image: row.image || cosmetic.image || cosmetic.imageUrl || cosmetic.mediaUrl,
    stock,
    minStock,
    unit: pickString(row.unit, cosmetic.unit, ''),
    lots: Array.isArray(row.lots)
      ? row.lots.map(normaliseLot)
      : [],
    hasLots: row.hasLots !== false,
    raw: row,
  };
};

const normaliseLot = (lot) => {
  const qty = pickNumber(lot.quantity, lot.qty, lot.remaining, lot.stock);
  return {
    id: lot.id ?? lot._id,
    code: pickString(lot.code, lot.lotCode, lot.batchCode, lot.sku),
    receivedAt: lot.receivedAt || lot.importedAt || lot.createdAt,
    expiresAt: lot.expiresAt || lot.expiryDate || lot.expirationDate,
    quantity: qty,
    note: lot.note || '',
    raw: lot,
  };
};

const getRowStatus = (row) => {
  const stock = pickNumber(row.stock);
  if (stock <= 0) return { id: 'out_of_stock', variant: 'error', label: 'Hết hàng' };
  if (row.minStock && stock <= row.minStock) {
    return { id: 'low_stock', variant: 'warning', label: 'Sắp hết' };
  }
  return { id: 'in_stock', variant: 'success', label: 'Còn hàng' };
};

const getLotStatus = (lot) => {
  const days = daysUntil(lot.expiresAt);
  if (days === null) return null;
  if (days < 0) return { id: 'expired', variant: 'error', label: 'Đã hết hạn' };
  if (days <= 30) return { id: 'expiring', variant: 'warning', label: `Còn ${days} ngày` };
  return null;
};

// =========================================================
// Stock-in modal
// =========================================================
function StockInModal({ isOpen, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    lotCode: '',
    quantity: '',
    receivedAt: '',
    expiresAt: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().substring(0, 10);
    setForm({ lotCode: '', quantity: '', receivedAt: today, expiresAt: '', note: '' });
    setErrors({});
    setGlobalError(null);
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};
    const qty = Number(form.quantity);
    if (form.quantity === '' || Number.isNaN(qty)) next.quantity = 'Vui lòng nhập số lượng.';
    else if (qty <= 0 || !Number.isInteger(qty)) next.quantity = 'Số lượng phải là số nguyên dương.';
    if (!form.receivedAt) next.receivedAt = 'Vui lòng nhập ngày nhập.';
    if (form.expiresAt && form.receivedAt && form.expiresAt < form.receivedAt) {
      next.expiresAt = 'Ngày hết hạn phải sau ngày nhập.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        quantity: Number(form.quantity),
        receivedAt: form.receivedAt || undefined,
        expiresAt: form.expiresAt || undefined,
        lotCode: form.lotCode.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      const saved = await stockInInventory(item.id, payload);
      onSaved?.(saved);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể nhập kho.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={`Nhập kho - ${item.name}`}
      size="md"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>Xác nhận nhập kho</Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <div className="admin-form-row">
          <Input
            label="Mã lô (không bắt buộc)"
            value={form.lotCode}
            onChange={handleChange('lotCode')}
            placeholder="VD: LOT-2024-001"
          />
          <Input
            label="Số lượng nhập"
            type="number"
            inputMode="numeric"
            min="1"
            value={form.quantity}
            onChange={handleChange('quantity')}
            error={errors.quantity}
            required
          />
        </div>
        <div className="admin-form-row">
          <Input
            label="Ngày nhập"
            type="date"
            value={form.receivedAt}
            onChange={handleChange('receivedAt')}
            error={errors.receivedAt}
            required
          />
          <Input
            label="Ngày hết hạn (không bắt buộc)"
            type="date"
            value={form.expiresAt}
            onChange={handleChange('expiresAt')}
            error={errors.expiresAt}
          />
        </div>
        <div className="input-group">
          <label htmlFor="stockin-note" className="input-label">Ghi chú</label>
          <textarea
            id="stockin-note"
            className="admin-textarea"
            value={form.note}
            onChange={handleChange('note')}
            placeholder="Nhà cung cấp, số hóa đơn nhập, ghi chú..."
            rows={2}
          />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)', margin: 0 }}>
          Tồn kho hiện tại: <strong>{item.stock}</strong>
          {item.minStock ? ` / Tối thiểu: ${item.minStock}` : ''}
        </p>
      </form>
    </Modal>
  );
}

// =========================================================
// Lot edit modal
// =========================================================
function LotEditModal({ isOpen, item, lot, onClose, onSaved }) {
  const [form, setForm] = useState({ quantity: '', expiresAt: '', note: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (lot) {
      const exp = lot.expiresAt ? new Date(lot.expiresAt).toISOString().substring(0, 10) : '';
      setForm({
        quantity: lot.quantity !== undefined ? String(lot.quantity) : '',
        expiresAt: exp,
        note: lot.note || '',
      });
    }
    setErrors({});
    setGlobalError(null);
  }, [isOpen, lot]);

  if (!isOpen || !item || !lot) return null;

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};
    const qty = Number(form.quantity);
    if (form.quantity === '' || Number.isNaN(qty)) next.quantity = 'Vui lòng nhập số lượng.';
    else if (qty < 0 || !Number.isInteger(qty)) next.quantity = 'Số lượng phải là số nguyên không âm.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        quantity: Number(form.quantity),
        expiresAt: form.expiresAt || null,
        note: form.note.trim() || undefined,
      };
      const saved = await updateInventoryLot(item.id, lot.id, payload);
      onSaved?.(saved);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể cập nhật lô.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={`Cập nhật lô ${lot.code || lot.id}`}
      size="sm"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>Lưu thay đổi</Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <Input
          label="Số lượng còn lại"
          type="number"
          inputMode="numeric"
          min="0"
          value={form.quantity}
          onChange={handleChange('quantity')}
          error={errors.quantity}
          required
        />
        <Input
          label="Ngày hết hạn"
          type="date"
          value={form.expiresAt}
          onChange={handleChange('expiresAt')}
        />
        <div className="input-group">
          <label htmlFor="lot-note" className="input-label">Ghi chú</label>
          <textarea
            id="lot-note"
            className="admin-textarea"
            value={form.note}
            onChange={handleChange('note')}
            rows={2}
          />
        </div>
      </form>
    </Modal>
  );
}

// =========================================================
// Inventory page
// =========================================================
function AdminInventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [stockFilter, setStockFilter] = useState('all');

  const [expandedId, setExpandedId] = useState(null);
  const [lotsState, setLotsState] = useState({}); // { [id]: { loading, error, lots } }

  const [stockInItem, setStockInItem] = useState(null);
  const [editLot, setEditLot] = useState(null);

  const [globalError, setGlobalError] = useState(null);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getInventory();
      setRows(list.map(normaliseInventoryRow));
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải tồn kho.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ensureLots = useCallback(async (id) => {
    if (!id) return;
    setLotsState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), loading: true, error: null },
    }));
    try {
      const lots = (await getInventoryLots(id)).map(normaliseLot);
      setLotsState((prev) => ({
        ...prev,
        [id]: { loading: false, error: null, lots },
      }));
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, lots } : r)));
    } catch (err) {
      const message = extractApiError(err, 'Không thể tải chi tiết lô.');
      setLotsState((prev) => ({
        ...prev,
        [id]: { loading: false, error: message, lots: [] },
      }));
    }
  }, []);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (!lotsState[id]?.lots && !lotsState[id]?.error) {
      ensureLots(id);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const matches =
          (row.name || '').toLowerCase().includes(q)
          || (row.sku || '').toLowerCase().includes(q)
          || (row.brand || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (stockFilter === 'low' && row.stock > (row.minStock || 0)) return false;
      if (stockFilter === 'low' && row.stock <= 0) return false;
      if (stockFilter === 'out' && row.stock > 0) return false;
      if (stockFilter === 'in_stock' && row.stock <= 0) return false;
      return true;
    });
  }, [rows, debouncedSearch, stockFilter]);

  const kpis = useMemo(() => {
    let outCount = 0;
    let lowCount = 0;
    let expiringCount = 0;
    rows.forEach((row) => {
      if (row.stock <= 0) outCount += 1;
      else if (row.minStock && row.stock <= row.minStock) lowCount += 1;
      (row.lots || []).forEach((lot) => {
        const status = getLotStatus(lot);
        if (status && status.id === 'expiring') expiringCount += 1;
      });
    });
    return { outCount, lowCount, expiringCount, total: rows.length };
  }, [rows]);

  const handleStockIn = (item) => setStockInItem(item);

  const handleStockInSaved = (saved) => {
    setStockInItem(null);
    setBanner({ type: 'success', text: 'Đã nhập kho thành công.' });
    if (saved && typeof saved === 'object') {
      const id = saved.id ?? saved._id;
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...saved } : row)),
      );
    }
    load();
    if (expandedId) ensureLots(expandedId);
  };

  const handleEditLot = (item, lot) => setEditLot({ item, lot });

  const handleEditLotSaved = (saved) => {
    setEditLot(null);
    setBanner({ type: 'success', text: 'Đã cập nhật thông tin lô.' });
    if (saved && typeof saved === 'object' && editLot) {
      const lotId = saved.id ?? saved._id ?? editLot.lot.id;
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== editLot.item.id) return row;
          const lots = (row.lots || []).map((l) =>
            (l.id === lotId ? { ...l, ...saved } : l),
          );
          return { ...row, lots };
        }),
      );
    }
    if (expandedId) ensureLots(expandedId);
  };

  const handleRefreshAll = async () => {
    setGlobalError(null);
    try {
      await load();
      if (expandedId) await ensureLots(expandedId);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể tải lại tồn kho.'));
    }
  };

  const pageLoading = loading;
  const pageError = error;

  if (pageLoading) {
    return (
      <div>
        <PageHeader title="Kho mỹ phẩm" description="Quản lý tồn kho và các lô nhập" />
        <LoadingState message="Đang tải tồn kho..." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div>
        <PageHeader title="Kho mỹ phẩm" description="Quản lý tồn kho và các lô nhập" />
        <ErrorState title="Không tải được tồn kho" message={pageError} onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kho mỹ phẩm"
        description="Quản lý tồn kho, cảnh báo sắp hết và các lô nhập"
        actions={<Button onClick={handleRefreshAll}>Tải lại</Button>}
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
          <span className="admin-kpi-label">Tổng sản phẩm</span>
          <span className="admin-kpi-value">{kpis.total}</span>
          <span className="admin-kpi-hint">Đang theo dõi</span>
        </div>
        <div className="admin-kpi-card admin-kpi-card--warning">
          <span className="admin-kpi-label">Sắp hết</span>
          <span className="admin-kpi-value">{kpis.lowCount}</span>
          <span className="admin-kpi-hint">Dưới ngưỡng cảnh báo</span>
        </div>
        <div className="admin-kpi-card admin-kpi-card--error">
          <span className="admin-kpi-label">Hết hàng</span>
          <span className="admin-kpi-value">{kpis.outCount}</span>
          <span className="admin-kpi-hint">Cần nhập kho</span>
        </div>
        <div className="admin-kpi-card admin-kpi-card--warning">
          <span className="admin-kpi-label">Sắp hết hạn</span>
          <span className="admin-kpi-value">{kpis.expiringCount}</span>
          <span className="admin-kpi-hint">Lô còn dưới 30 ngày</span>
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
            placeholder="Tìm theo tên, SKU, thương hiệu..."
            aria-label="Tìm mỹ phẩm"
          />
        </div>
        <span className="admin-toolbar-spacer" />
        <div className="admin-filter-bar" role="group" aria-label="Lọc tồn kho">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`admin-chip${stockFilter === f.id ? ' admin-chip--active' : ''}`}
              onClick={() => setStockFilter(f.id)}
              aria-pressed={stockFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filtered.length}/{rows.length} sản phẩm
        </span>
      </div>

      <div className="card admin-table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Không có kết quả' : 'Chưa có dữ liệu tồn kho'}
            description={
              search
                ? 'Thử từ khoá khác hoặc xoá bộ lọc.'
                : 'Hệ thống chưa có dữ liệu tồn kho.'
            }
          />
        ) : (
          <>
            <table className="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th aria-label="Mở rộng" style={{ width: '40px' }} />
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Tồn kho</th>
                  <th>Ngưỡng</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const status = getRowStatus(row);
                  const isOpen = expandedId === row.id;
                  return (
                    <RowFragment
                      key={row.id}
                      row={row}
                      status={status}
                      isOpen={isOpen}
                      onToggle={() => toggleExpand(row.id)}
                      lotsState={lotsState[row.id]}
                      onStockIn={() => handleStockIn(row)}
                      onEditLot={(lot) => handleEditLot(row, lot)}
                    />
                  );
                })}
              </tbody>
            </table>

            <div className="admin-table-cards">
              {filtered.map((row) => {
                const status = getRowStatus(row);
                return (
                  <div className="admin-table-card-row" key={`m-${row.id}`}>
                    <div className="admin-table-card-row-top">
                      <div>
                        <div className="admin-table-card-row-title">{row.name}</div>
                        <div className="admin-table-card-row-sub">
                          {row.brand ? `${row.brand}` : 'Không rõ thương hiệu'}
                          {row.sku ? ` - SKU: ${row.sku}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={status.variant}>{status.label}</StatusBadge>
                    </div>
                    <div className="admin-table-card-row-meta">
                      <span>Tồn kho: <strong>{row.stock}</strong></span>
                      <span>Ngưỡng: {row.minStock || '-'}</span>
                    </div>
                    <div className="admin-table-card-row-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => toggleExpand(row.id)}
                      >
                        {expandedId === row.id ? 'Ẩn lô' : 'Xem lô'}
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => handleStockIn(row)}
                      >
                        Nhập kho
                      </button>
                    </div>
                    {expandedId === row.id && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <LotDetail
                          lotsState={lotsState[row.id]}
                          lots={row.lots}
                          onEditLot={(lot) => handleEditLot(row, lot)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <StockInModal
        isOpen={!!stockInItem}
        item={stockInItem}
        onClose={() => setStockInItem(null)}
        onSaved={handleStockInSaved}
      />

      {editLot && (
        <LotEditModal
          isOpen={!!editLot}
          item={editLot.item}
          lot={editLot.lot}
          onClose={() => setEditLot(null)}
          onSaved={handleEditLotSaved}
        />
      )}
    </div>
  );
}

// =========================================================
// Row with expandable lot list
// =========================================================
function RowFragment({ row, status, isOpen, onToggle, lotsState, onStockIn, onEditLot }) {
  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            className="admin-table-action-btn"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Ẩn chi tiết lô' : 'Xem chi tiết lô'}
          >
            {isOpen ? '−' : '+'}
          </button>
        </td>
        <td>
          <div className="admin-table-name">{row.name}</div>
          {row.brand && <div className="admin-table-sub">{row.brand}</div>}
        </td>
        <td>{row.sku || '-'}</td>
        <td><strong>{row.stock}</strong></td>
        <td>{row.minStock || '-'}</td>
        <td>
          <StatusBadge status={status.variant}>{status.label}</StatusBadge>
        </td>
        <td>
          <div className="admin-table-actions">
            <button
              type="button"
              className="admin-table-action-btn"
              onClick={onStockIn}
            >
              Nhập kho
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="admin-expand-row">
          <td colSpan={7}>
            <LotDetail
              lotsState={lotsState}
              lots={row.lots}
              onEditLot={onEditLot}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function LotDetail({ lotsState, lots, onEditLot }) {
  if (!lotsState && (!lots || lots.length === 0)) {
    return (
      <p style={{ margin: 0, color: 'var(--color-charcoal-muted)' }}>
        Đang tải chi tiết lô...
      </p>
    );
  }
  if (lotsState?.loading) {
    return (
      <p style={{ margin: 0, color: 'var(--color-charcoal-muted)' }}>
        Đang tải chi tiết lô...
      </p>
    );
  }
  if (lotsState?.error) {
    return (
      <div className="admin-banner admin-banner--error" role="alert">
        <span>{lotsState.error}</span>
      </div>
    );
  }
  if (!lots || lots.length === 0) {
    return (
      <p style={{ margin: 0, color: 'var(--color-charcoal-muted)' }}>
        Sản phẩm này chưa có lô nhập nào.
      </p>
    );
  }
  return (
    <table className="admin-lot-table">
      <thead>
        <tr>
          <th>Mã lô</th>
          <th>Ngày nhập</th>
          <th>Ngày hết hạn</th>
          <th>Số lượng</th>
          <th>Cảnh báo</th>
          <th aria-label="Hành động" style={{ textAlign: 'right' }} />
        </tr>
      </thead>
      <tbody>
        {lots.map((lot) => {
          const status = getLotStatus(lot);
          return (
            <tr key={lot.id}>
              <td>{lot.code || '-'}</td>
              <td>{formatDate(lot.receivedAt)}</td>
              <td className={status?.id === 'expired' ? 'admin-lot-expired' : status?.id === 'expiring' ? 'admin-lot-expiring' : ''}>
                {formatDate(lot.expiresAt)}
              </td>
              <td>{lot.quantity}</td>
              <td>
                {status ? (
                  <span className={`admin-inline-${status.id === 'expired' ? 'error' : 'warn'}`}>
                    {status.label}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  className="admin-table-action-btn"
                  onClick={() => onEditLot(lot)}
                >
                  Cập nhật
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default AdminInventory;
