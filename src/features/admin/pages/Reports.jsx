import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@/components/common';
import { formatCurrency } from '@/utils/formatters';
import {
  extractApiError,
  getAppointmentsForReport,
  getCustomersForReport,
  getPaidInvoicesForReport,
  getReportsOverview,
} from '@/services/adminService';

// =========================================================
// Period presets
// =========================================================
const PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'quarter', label: 'Quý này' },
  { id: 'year', label: 'Năm này' },
  { id: 'custom', label: 'Khoảng ngày' },
];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const toISODate = (d) => {
  // Local-time YYYY-MM-DD for input[type="date"].
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * Resolve the date range for the active preset.
 * Returns [start, end] as Date objects (inclusive at both ends).
 */
function resolveRange(preset, customStart, customEnd) {
  const now = new Date();
  if (preset === 'today') {
    return [startOfDay(now), endOfDay(now)];
  }
  if (preset === 'week') {
    // Tuần này: thứ 2 → hôm nay (theo múa local)
    const day = now.getDay(); // 0=CN, 1=T2, ...
    const diffToMonday = (day + 6) % 7;
    const monday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday));
    return [monday, endOfDay(now)];
  }
  if (preset === 'month') {
    return [startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), endOfDay(now)];
  }
  if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return [startOfDay(new Date(now.getFullYear(), q * 3, 1)), endOfDay(now)];
  }
  if (preset === 'year') {
    return [startOfDay(new Date(now.getFullYear(), 0, 1)), endOfDay(now)];
  }
  // custom
  const s = parseISODate(customStart);
  const e = parseISODate(customEnd);
  if (s && e) return [startOfDay(s), endOfDay(e)];
  if (s) return [startOfDay(s), endOfDay(now)];
  if (e) return [startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), endOfDay(e)];
  return [startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), endOfDay(now)];
}

// =========================================================
// Helpers - normalise backend shapes
// =========================================================
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

const normaliseInvoice = (inv) => {
  const id = inv.id ?? inv._id;
  const status = pickString(inv.status, 'PENDING').toUpperCase();
  const createdAt = inv.createdAt || inv.issuedAt || inv.paidAt || inv.date;
  const total = pickNumber(inv.totalAmount, inv.total, inv.amount, 0);
  const serviceAmount = pickNumber(inv.serviceAmount, inv.serviceTotal);
  const cosmeticAmount = pickNumber(inv.cosmeticAmount, inv.productAmount, inv.itemsAmount);
  const items = Array.isArray(inv.items) ? inv.items.map((item) => ({
    type: pickString(item.type, item.kind, 'SERVICE').toUpperCase(),
    name: pickString(item.name, item.serviceName, item.cosmeticName, item.productName, 'Sản phẩm'),
    quantity: pickNumber(item.quantity, item.qty, 1),
    total: pickNumber(item.total, item.amount, 0),
  })) : [];
  return { id, status, createdAt, total, serviceAmount, cosmeticAmount, items, raw: inv };
};

const normaliseCustomer = (c) => ({
  id: c.id ?? c._id,
  createdAt: c.createdAt || c.registeredAt || c.joinedAt,
});

const normaliseAppointment = (apt) => ({
  id: apt.id ?? apt._id,
  createdAt: apt.createdAt || apt.date || apt.startTime,
});

// =========================================================
// Local computation from paid invoices / customers / appointments
// (used when the backend doesn't pre-aggregate the report)
// =========================================================
function computeKpis({ paidInvoices, customers, appointments, inventory }) {
  let revenue = 0;
  let serviceRevenue = 0;
  let cosmeticRevenue = 0;
  const dailyMap = new Map(); // yyyy-mm-dd -> revenue
  const monthlyMap = new Map(); // yyyy-mm -> revenue
  const cosmeticAgg = new Map(); // name -> { quantity, revenue }

  paidInvoices.forEach((inv) => {
    revenue += inv.total;
    serviceRevenue += inv.serviceAmount || 0;
    cosmeticRevenue += inv.cosmeticAmount || 0;
    const d = parseDate(inv.createdAt);
    if (d) {
      const dayKey = toISODate(d);
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + inv.total);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + inv.total);
    }
    inv.items.forEach((item) => {
      if (item.type === 'COSMETIC' || item.type === 'PRODUCT') {
        const key = item.name;
        const prev = cosmeticAgg.get(key) || { quantity: 0, revenue: 0 };
        cosmeticAgg.set(key, {
          quantity: prev.quantity + item.quantity,
          revenue: prev.revenue + item.total,
        });
      }
    });
  });

  const totalStock = Array.isArray(inventory)
    ? inventory.reduce((sum, row) => sum + pickNumber(row.stock, row.quantity, 0), 0)
    : 0;

  const topCosmetics = Array.from(cosmeticAgg.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    revenue,
    serviceRevenue,
    cosmeticRevenue,
    appointmentCount: appointments.length,
    customerCount: customers.length,
    newCustomerCount: customers.length,
    totalStock,
    dailyRevenue: Array.from(dailyMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, value]) => ({ date, value })),
    monthlyRevenue: Array.from(monthlyMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, value]) => ({ month, value })),
    topCosmetics,
  };
}

function readBackendKpis(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const revenue = payload.revenue || {};
  const customers = payload.customers || {};
  const appointments = payload.appointments || {};
  const inventory = payload.inventory || {};
  return {
    revenue: pickNumber(revenue.total, payload.totalRevenue),
    serviceRevenue: pickNumber(revenue.serviceAmount, revenue.service),
    cosmeticRevenue: pickNumber(revenue.cosmeticAmount, revenue.cosmetic),
    appointmentCount: pickNumber(appointments.total, payload.totalAppointments),
    customerCount: pickNumber(customers.total, payload.totalCustomers),
    newCustomerCount: pickNumber(customers.newCount, payload.newCustomers),
    totalStock: pickNumber(inventory.totalStock, inventory.stock, payload.totalStock),
    dailyRevenue: Array.isArray(revenue.byDay)
      ? revenue.byDay.map((p) => ({ date: pickString(p.date, p.day), value: pickNumber(p.value, p.total, p.amount) }))
      : [],
    monthlyRevenue: Array.isArray(revenue.byMonth)
      ? revenue.byMonth.map((p) => ({ month: pickString(p.month, p.date), value: pickNumber(p.value, p.total, p.amount) }))
      : [],
    topCosmetics: Array.isArray(revenue.topCosmetics)
      ? revenue.topCosmetics.map((p) => ({
        name: pickString(p.name, p.cosmeticName, 'Sản phẩm'),
        quantity: pickNumber(p.quantity, p.qty, 0),
        revenue: pickNumber(p.revenue, p.total, p.amount),
      }))
      : [],
  };
}

// =========================================================
// KpiCard
// =========================================================
function KpiCard({ label, value, hint, variant }) {
  return (
    <div className={`admin-kpi-card${variant ? ` admin-kpi-card--${variant}` : ''}`}>
      <span className="admin-kpi-label">{label}</span>
      <span className="admin-kpi-value">{value}</span>
      {hint && <span className="admin-kpi-hint">{hint}</span>}
    </div>
  );
}

// =========================================================
// Line chart (revenue over time) - pure SVG
// =========================================================
function LineChart({ data, formatY, height: chartHeight = 220 }) {
  const W = 720;
  const H = chartHeight;
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const width = W - padding.left - padding.right;
  const innerHeight = H - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = 0;
  const range = Math.max(1, max - min);

  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = padding.left + i * step;
    const y = padding.top + innerHeight - ((d.value - min) / range) * innerHeight;
    return { x, y, value: d.value, label: d.date || d.month };
  });

  // Build path
  const path = points.length === 0
    ? ''
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaPath = points.length === 0
    ? ''
    : `${path} L ${points[points.length - 1].x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} Z`;

  // Y-axis ticks (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padding.top + innerHeight - p * innerHeight,
    value: Math.round(min + p * range),
  }));

  // Show at most 6 X labels
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const xLabels = points.map((p, i) => ({ ...p, show: i % labelStep === 0 || i === points.length - 1 }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ doanh thu" style={{ width: '100%', height: 'auto' }}>
      {/* Y grid */}
      {yTicks.map((t, i) => (
        <g key={`y-${i}`}>
          <line
            x1={padding.left}
            y1={t.y}
            x2={padding.left + width}
            y2={t.y}
            stroke="var(--color-border-light)"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={t.y + 4}
            fontSize="11"
            textAnchor="end"
            fill="var(--color-charcoal-muted)"
          >
            {formatY(t.value)}
          </text>
        </g>
      ))}
      {/* Area + line */}
      {data.length > 0 && (
        <>
          <path d={areaPath} fill="var(--color-green-pale)" opacity="0.7" />
          <path d={path} fill="none" stroke="var(--color-green-deep)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-green-deep)" />
          ))}
        </>
      )}
      {/* X labels */}
      {xLabels.map((p, i) => (
        p.show ? (
          <text
            key={`x-${i}`}
            x={p.x}
            y={padding.top + innerHeight + 18}
            fontSize="11"
            textAnchor="middle"
            fill="var(--color-charcoal-muted)"
          >
            {p.label}
          </text>
        ) : null
      ))}
    </svg>
  );
}

// =========================================================
// Donut chart (service vs cosmetic)
// =========================================================
function DonutChart({ service, cosmetic }) {
  const total = Math.max(0, service) + Math.max(0, cosmetic);
  const size = 180;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const serviceShare = total > 0 ? service / total : 0;
  const cosmeticShare = total > 0 ? cosmetic / total : 0;

  return (
    <div className="report-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Tỷ trọng doanh thu">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-ivory-dark)"
          strokeWidth={stroke}
        />
        {total > 0 && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--color-green-deep)"
              strokeWidth={stroke}
              strokeDasharray={`${(serviceShare * circumference).toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={(circumference / 4).toFixed(2)}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={stroke}
              strokeDasharray={`${(cosmeticShare * circumference).toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={(circumference / 4 - serviceShare * circumference).toFixed(2)}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </>
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill="var(--color-charcoal-muted)">
          Tổng
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--color-charcoal)">
          {formatCurrency(total)}
        </text>
      </svg>
      <div className="report-donut-legend">
        <div className="report-donut-legend-row">
          <span className="report-donut-swatch" style={{ backgroundColor: 'var(--color-green-deep)' }} />
          <span className="report-donut-label">Dịch vụ</span>
          <span className="report-donut-value">{formatCurrency(service)}</span>
          <span className="report-donut-pct">{total > 0 ? `${Math.round(serviceShare * 100)}%` : '-'}</span>
        </div>
        <div className="report-donut-legend-row">
          <span className="report-donut-swatch" style={{ backgroundColor: 'var(--color-gold)' }} />
          <span className="report-donut-label">Mỹ phẩm</span>
          <span className="report-donut-value">{formatCurrency(cosmetic)}</span>
          <span className="report-donut-pct">{total > 0 ? `${Math.round(cosmeticShare * 100)}%` : '-'}</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Horizontal bar chart (top cosmetics)
// =========================================================
function BarChart({ data, formatX }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="report-bar-list">
      {data.map((d, i) => {
        const pct = Math.max(0, Math.min(100, (d.value / max) * 100));
        return (
          <div className="report-bar-row" key={`${d.name}-${i}`}>
            <div className="report-bar-label" title={d.name}>{d.name}</div>
            <div className="report-bar-track">
              <div className="report-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="report-bar-value">{formatX(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================
// Page
// =========================================================
function AdminReports() {
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [rangeError, setRangeError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [range, setRange] = useState(() => resolveRange('month', '', ''));

  // Recompute range when preset or custom dates change
  useEffect(() => {
    if (preset !== 'custom') {
      setRangeError(null);
      const next = resolveRange(preset, '', '');
      setRange(next);
      return;
    }
    // Custom validation
    const s = parseISODate(customStart);
    const e = parseISODate(customEnd);
    if (s && e && s.getTime() > e.getTime()) {
      setRangeError('Mốc thời gian không hợp lệ, vui lòng chọn lại.');
      setRange(null);
      return;
    }
    setRangeError(null);
    setRange(resolveRange('custom', customStart, customEnd || toISODate(new Date())));
  }, [preset, customStart, customEnd]);

  const fetchReport = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    setError(null);
    try {
      const [from, to] = range;
      const params = {
        from: from.toISOString(),
        to: to.toISOString(),
        range: preset,
      };
      const payload = await getReportsOverview(params);
      setOverview(payload || {});
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải báo cáo.'));
      setOverview({});
    } finally {
      setLoading(false);
    }
  }, [range, preset]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Derived KPIs - prefer backend `overview`, else compute from paid invoices
  const derivedKpis = useMemo(() => {
    if (!overview) return null;
    const fromBackend = readBackendKpis(overview);
    if (fromBackend && (fromBackend.revenue || fromBackend.appointmentCount)) {
      return fromBackend;
    }
    return null;
  }, [overview]);

  const needsLocalCompute = !derivedKpis;

  // Local computation fallback
  const [localKpis, setLocalKpis] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!needsLocalCompute || !range) return;
    let cancelled = false;
    (async () => {
      setLocalLoading(true);
      setLocalError(null);
      try {
        const [from, to] = range;
        const commonParams = {
          from: from.toISOString(),
          to: to.toISOString(),
        };
        const [paidInvoices, customers, appointments] = await Promise.all([
          getPaidInvoicesForReport(commonParams).catch(() => []),
          getCustomersForReport(commonParams).catch(() => []),
          getAppointmentsForReport(commonParams).catch(() => []),
        ]);
        if (cancelled) return;
        const normalised = {
          paidInvoices: paidInvoices.map(normaliseInvoice),
          customers: customers.map(normaliseCustomer),
          appointments: appointments.map(normaliseAppointment),
          inventory: [],
        };
        setLocalKpis(computeKpis(normalised));
      } catch (err) {
        if (cancelled) return;
        setLocalError(extractApiError(err, 'Không thể tải dữ liệu báo cáo.'));
        setLocalKpis(null);
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsLocalCompute, range]);

  const kpis = derivedKpis || localKpis;

  // Range label
  const rangeLabel = useMemo(() => {
    if (!range) return '';
    const [s, e] = range;
    const fmt = (d) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (toISODate(s) === toISODate(e)) return fmt(s);
    return `${fmt(s)} - ${fmt(e)}`;
  }, [range]);

  const isEmpty = !loading && !error && !rangeError && kpis
    && kpis.revenue === 0
    && kpis.serviceRevenue === 0
    && kpis.cosmeticRevenue === 0
    && (kpis.dailyRevenue || []).length === 0
    && (kpis.monthlyRevenue || []).length === 0
    && (kpis.topCosmetics || []).length === 0;

  const dailyRevenue = kpis?.dailyRevenue || [];
  const monthlyRevenue = kpis?.monthlyRevenue || [];
  const topCosmetics = kpis?.topCosmetics || [];

  // Pick day vs month series - length > 14 ⇒ monthly
  const revenueSeries = dailyRevenue.length >= 2
    ? dailyRevenue
    : monthlyRevenue.length >= 1
      ? monthlyRevenue
      : dailyRevenue;

  const showLocalSpinner = loading || (needsLocalCompute && localLoading);

  return (
    <div>
      <PageHeader
        title="Báo cáo & thống kê"
        description="Tổng quan doanh thu, khách hàng và tồn kho theo khoảng thời gian"
      />

      {/* Filter bar */}
      <div className="card" style={{ padding: 'var(--space-5) var(--space-6)' }}>
        <div className="admin-filter-bar" role="group" aria-label="Bộ lọc thời gian">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-chip${preset === p.id ? ' admin-chip--active' : ''}`}
              onClick={() => setPreset(p.id)}
              aria-pressed={preset === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="report-custom-range">
            <div className="report-custom-range-field">
              <label htmlFor="report-start" className="input-label">Từ ngày</label>
              <input
                id="report-start"
                type="date"
                value={customStart}
                max={customEnd || toISODate(new Date())}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input"
              />
            </div>
            <div className="report-custom-range-field">
              <label htmlFor="report-end" className="input-label">Đến ngày</label>
              <input
                id="report-end"
                type="date"
                value={customEnd}
                min={customStart || undefined}
                max={toISODate(new Date())}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}

        {rangeError && (
          <div className="admin-banner admin-banner--error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
            <span>{rangeError}</span>
          </div>
        )}

        <div className="report-range-summary">
          <span className="admin-form-help">
            Khoảng thời gian: <strong>{rangeLabel || '-'}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={fetchReport} disabled={showLocalSpinner || !range}>
            Tải lại
          </Button>
        </div>
      </div>

      {rangeError ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <EmptyState
            title="Mốc thời gian không hợp lệ"
            description="Vui lòng chọn lại khoảng ngày hợp lệ."
          />
        </div>
      ) : showLocalSpinner ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <LoadingState message="Đang tải báo cáo..." />
        </div>
      ) : error ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <ErrorState
            title="Không tải được báo cáo"
            message={error}
            onRetry={fetchReport}
          />
        </div>
      ) : localError && !derivedKpis ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <ErrorState
            title="Không tải được dữ liệu bổ sung"
            message={localError}
            onRetry={fetchReport}
          />
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="admin-kpi-grid" style={{ marginTop: 'var(--space-6)' }}>
            <KpiCard
              label="Tổng doanh thu"
              value={formatCurrency(kpis?.revenue || 0)}
              hint="Từ hóa đơn đã thanh toán"
              variant="success"
            />
            <KpiCard
              label="Tổng tồn mỹ phẩm"
              value={kpis?.totalStock ?? 0}
              hint="Số lượng sản phẩm trong kho"
            />
            <KpiCard
              label="Khách hàng"
              value={kpis?.customerCount ?? 0}
              hint="Khách đã đăng ký"
            />
            <KpiCard
              label="Lịch hẹn"
              value={kpis?.appointmentCount ?? 0}
              hint="Trong khoảng thời gian"
            />
          </div>

          {isEmpty ? (
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <div className="card-body">
                <EmptyState
                  title="Không có dữ liệu phát sinh trong khoảng thời gian này."
                  description="Hãy thử chọn khoảng thời gian dài hơn hoặc quay lại sau khi có giao dịch mới."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Revenue over time */}
              <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="admin-table-meta">
                  <span>
                    Doanh thu theo {dailyRevenue.length >= 2 ? 'ngày' : 'tháng'}
                  </span>
                  <span>{formatCurrency(kpis?.revenue || 0)}</span>
                </div>
                <div className="card-body" style={{ paddingTop: 'var(--space-4)' }}>
                  {revenueSeries.length === 0 ? (
                    <EmptyState
                      title="Không có dữ liệu phát sinh trong khoảng thời gian này."
                    />
                  ) : (
                    <LineChart
                      data={revenueSeries}
                      formatY={(v) => {
                        if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}tr`;
                        if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                        return String(v);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Revenue split donut + top cosmetics bars */}
              <div className="report-grid-2">
                <div className="card">
                  <div className="admin-table-meta">
                    <span>Tỷ trọng doanh thu</span>
                    <span>Dịch vụ / Mỹ phẩm</span>
                  </div>
                  <div className="card-body">
                    {(kpis?.serviceRevenue || 0) + (kpis?.cosmeticRevenue || 0) === 0 ? (
                      <EmptyState title="Không có dữ liệu phát sinh trong khoảng thời gian này." />
                    ) : (
                      <DonutChart
                        service={kpis?.serviceRevenue || 0}
                        cosmetic={kpis?.cosmeticRevenue || 0}
                      />
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="admin-table-meta">
                    <span>Top mỹ phẩm bán chạy</span>
                    <span>{topCosmetics.length} sản phẩm</span>
                  </div>
                  <div className="card-body">
                    {topCosmetics.length === 0 ? (
                      <EmptyState title="Không có dữ liệu phát sinh trong khoảng thời gian này." />
                    ) : (
                      <BarChart
                        data={topCosmetics.map((c) => ({ name: c.name, value: c.revenue }))}
                        formatX={(v) => formatCurrency(v)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Top cosmetics table - bonus context */}
              {topCosmetics.length > 0 && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                  <div className="admin-table-meta">
                    <span>Chi tiết mỹ phẩm bán chạy</span>
                    <span>{topCosmetics.length} sản phẩm</span>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th style={{ textAlign: 'right' }}>Số lượng</th>
                        <th style={{ textAlign: 'right' }}>Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCosmetics.map((c, i) => (
                        <tr key={`${c.name}-${i}`}>
                          <td>
                            <div className="admin-table-name">{c.name}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{c.quantity}</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{formatCurrency(c.revenue)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Footnote about revenue source */}
          <p className="admin-form-help" style={{ marginTop: 'var(--space-6)' }}>
            Doanh thu được tính từ các hóa đơn ở trạng thái <StatusBadge variant="success">Đã thanh toán</StatusBadge>.
          </p>
        </>
      )}
    </div>
  );
}

export default AdminReports;
