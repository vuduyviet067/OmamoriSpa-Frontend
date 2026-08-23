import { useCallback, useEffect, useState } from 'react';
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
  getAdminRevenueReport,
  getAdminInventoryReport,
  getAdminCustomerStats,
  getAdminAppointmentStats,
} from '@/services/adminService';

// =========================================================
// Period presets
// =========================================================
const PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'quarter', label: 'Quý này' },
  { id: 'year', label: 'Năm nay' },
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
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday),
    );
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

/**
 * Choose trend granularity based on the SELECTED time range / preset,
 * not on how many points the backend returned.
 *
 * - Hôm nay / Tuần này / Tháng này  -> byDay
 * - Quý này / Năm nay               -> byMonth
 * - Custom range:
 *     span <= 62 calendar days      -> byDay
 *     span >  62 calendar days      -> byMonth
 */
function resolveGranularity(preset, range) {
  if (preset === 'today' || preset === 'week' || preset === 'month') {
    return 'day';
  }
  if (preset === 'quarter' || preset === 'year') {
    return 'month';
  }
  // custom
  if (!range) return 'day';
  const [s, e] = range;
  const start = startOfDay(s).getTime();
  const end = startOfDay(e).getTime();
  const spanDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return spanDays > 62 ? 'month' : 'day';
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

  const path = points.length === 0
    ? ''
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaPath = points.length === 0
    ? ''
    : `${path} L ${points[points.length - 1].x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padding.top + innerHeight - p * innerHeight,
    value: Math.round(min + p * range),
  }));

  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const xLabels = points.map((p, i) => ({ ...p, show: i % labelStep === 0 || i === points.length - 1 }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ doanh thu" style={{ width: '100%', height: 'auto' }}>
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
      {data.length > 0 && (
        <>
          <path d={areaPath} fill="var(--color-green-pale)" opacity="0.7" />
          <path d={path} fill="none" stroke="var(--color-green-deep)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-green-deep)" />
          ))}
        </>
      )}
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
          <span className="report-donut-label">Dịch vụ trị liệu</span>
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
  const [range, setRange] = useState(() => resolveRange('month', '', ''));

  const [revenue, setRevenue] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [appointments, setAppointments] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recompute range when preset or custom dates change.
  useEffect(() => {
    if (preset !== 'custom') {
      setRangeError(null);
      const next = resolveRange(preset, '', '');
      setRange(next);
      return;
    }
    const s = parseISODate(customStart);
    const e = parseISODate(customEnd);
    if (s && e && s.getTime() > e.getTime()) {
      setRangeError('Mốc thời gian không hợp lệ, vui lòng chọn lại');
      setRange(null);
      return;
    }
    setRangeError(null);
    setRange(
      resolveRange('custom', customStart, customEnd || toISODate(new Date())),
    );
  }, [preset, customStart, customEnd]);

  const fetchReport = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    setError(null);
    try {
      const [start, end] = range;
      const from = toISODate(start);
      const to = toISODate(end);
      // Inventory is a current snapshot - do NOT pass from/to.
      const [revenueRes, inventoryRes, customersRes, appointmentsRes] = await Promise.all([
        getAdminRevenueReport({ from, to }),
        getAdminInventoryReport(),
        getAdminCustomerStats({ from, to }),
        getAdminAppointmentStats({ from, to }),
      ]);
      setRevenue(revenueRes || {});
      setInventory(inventoryRes || {});
      setCustomers(customersRes || {});
      setAppointments(appointmentsRes || {});
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải báo cáo.'));
      setRevenue({});
      setInventory({});
      setCustomers({});
      setAppointments({});
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Derived numbers from backend-aggregated payloads.
  const totalRevenue = Number(revenue?.total || 0);
  const serviceAmount = Number(revenue?.serviceAmount || 0);
  const cosmeticAmount = Number(revenue?.cosmeticAmount || 0);
  const byDay = Array.isArray(revenue?.byDay) ? revenue.byDay : [];
  const byMonth = Array.isArray(revenue?.byMonth) ? revenue.byMonth : [];
  const topCosmetics = Array.isArray(revenue?.topCosmetics) ? revenue.topCosmetics : [];

  const totalStock = Number(inventory?.totalStock || 0);
  const lowStockCount = Number(inventory?.lowStockCount || 0);
  const outOfStockCount = Number(inventory?.outOfStockCount || 0);
  const lowStockThreshold = Number(inventory?.lowStockThreshold || 0);
  const lowStockItems = Array.isArray(inventory?.lowStockItems) ? inventory.lowStockItems : [];
  const outOfStockItems = Array.isArray(inventory?.outOfStockItems) ? inventory.outOfStockItems : [];

  const totalCustomers = Number(customers?.totalCustomers || 0);
  const newCustomers = Number(customers?.newCustomers || 0);

  const totalAppointments = Number(appointments?.totalAppointments || 0);
  const completedAppointments = Number(appointments?.completedAppointments || 0);

  // Trend granularity is driven by the SELECTED range / preset,
  // not by the number of returned data points. A short range that
  // happens to contain revenue on only one day is still shown as a
  // daily trend with that single real point.
  const granularity = resolveGranularity(preset, range);
  const revenueSeries = granularity === 'day' ? byDay : byMonth;
  const showTrendType = granularity === 'day' ? 'ngày' : 'tháng';

  // "No period activity" only when period-dependent metrics are all zero.
  // All-time inventory / totalCustomers are intentionally excluded.
  const isEmpty = !loading
    && !error
    && !rangeError
    && totalRevenue === 0
    && newCustomers === 0
    && totalAppointments === 0;

  const rangeLabel = (() => {
    if (!range) return '';
    const [s, e] = range;
    const fmt = (d) => d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (toISODate(s) === toISODate(e)) return fmt(s);
    return `${fmt(s)} - ${fmt(e)}`;
  })();

  return (
    <div>
      <PageHeader
        title="Báo cáo & thống kê"
        description="Tổng quan doanh thu, khách hàng, lịch hẹn và tồn kho theo khoảng thời gian"
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
          <Button variant="ghost" size="sm" onClick={fetchReport} disabled={loading || !range}>
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
      ) : loading ? (
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
      ) : (
        <>
          {/* KPI grid */}
          <div className="admin-kpi-grid" style={{ marginTop: 'var(--space-6)' }}>
            <KpiCard
              label="Tổng doanh thu"
              value={formatCurrency(totalRevenue)}
              hint="Từ hóa đơn đã thanh toán"
              variant="success"
            />
            <KpiCard
              label="Tổng tồn mỹ phẩm"
              value={totalStock}
              hint={`Ngưỡng cảnh báo: ≤ ${lowStockThreshold || '-'}`}
            />
            <KpiCard
              label="Tổng khách hàng"
              value={totalCustomers}
              hint="Khách đã đăng ký"
            />
            <KpiCard
              label="Lượt đặt lịch"
              value={totalAppointments}
              hint="Trong khoảng thời gian"
            />
            <KpiCard
              label="Khách hàng mới"
              value={newCustomers}
              hint="Trong khoảng thời gian"
            />
            <KpiCard
              label="Đã thực hiện"
              value={completedAppointments}
              hint="Lịch hẹn hoàn thành"
            />
            <KpiCard
              label="Sắp hết hàng"
              value={lowStockCount}
              hint={`≤ ${lowStockThreshold || '-'}`}
              variant="warning"
            />
            <KpiCard
              label="Hết hàng"
              value={outOfStockCount}
              hint="Cần nhập thêm"
              variant="error"
            />
          </div>

          {isEmpty ? (
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <div className="card-body">
                <EmptyState
                  title="Không có dữ liệu phát sinh trong khoảng thời gian này"
                  description="Hãy thử chọn khoảng thời gian dài hơn hoặc quay lại sau khi có giao dịch mới."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Revenue over time */}
              <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="admin-table-meta">
                  <span>Doanh thu theo {showTrendType}</span>
                  <span>{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="card-body" style={{ paddingTop: 'var(--space-4)' }}>
                  {revenueSeries.length === 0 ? (
                    <EmptyState title="Không có dữ liệu phát sinh trong khoảng thời gian này" />
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
                    <span>Dịch vụ trị liệu / Mỹ phẩm</span>
                  </div>
                  <div className="card-body">
                    {serviceAmount + cosmeticAmount === 0 ? (
                      <EmptyState title="Không có dữ liệu phát sinh trong khoảng thời gian này" />
                    ) : (
                      <DonutChart service={serviceAmount} cosmetic={cosmeticAmount} />
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
                      <EmptyState title="Không có dữ liệu phát sinh trong khoảng thời gian này" />
                    ) : (
                      <BarChart
                        data={topCosmetics.map((c) => ({
                          name: c.name || c.cosmeticName || 'Sản phẩm',
                          value: Number(c.revenue || 0),
                        }))}
                        formatX={(v) => formatCurrency(v)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Top cosmetics detail table */}
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
                        <tr key={`${c.cosmeticId || c.id || c.name}-${i}`}>
                          <td>
                            <div className="admin-table-name">{c.name || c.cosmeticName || 'Sản phẩm'}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{Number(c.quantity || 0)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{formatCurrency(Number(c.revenue || 0))}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Inventory low/out-of-stock details */}
              {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                  <div className="admin-table-meta">
                    <span>Chi tiết tồn kho cần chú ý</span>
                    <span>
                      Sắp hết {lowStockItems.length} · Hết hàng {outOfStockItems.length}
                    </span>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th style={{ textAlign: 'right' }}>Tồn kho</th>
                        <th style={{ textAlign: 'right' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outOfStockItems.map((it, i) => (
                        <tr key={`out-${it.id || it.cosmeticId || i}`}>
                          <td>
                            <div className="admin-table-name">{it.name || 'Sản phẩm'}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{Number(it.stockQuantity ?? 0)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <StatusBadge variant="error">Hết hàng</StatusBadge>
                          </td>
                        </tr>
                      ))}
                      {lowStockItems.map((it, i) => (
                        <tr key={`low-${it.id || it.cosmeticId || i}`}>
                          <td>
                            <div className="admin-table-name">{it.name || 'Sản phẩm'}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{Number(it.stockQuantity ?? 0)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <StatusBadge variant="warning">Sắp hết</StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <p className="admin-form-help" style={{ marginTop: 'var(--space-6)' }}>
            Doanh thu được tính từ các hóa đơn ở trạng thái <StatusBadge variant="success">Đã thanh toán</StatusBadge>.
            {' '}Tồn kho là ảnh chụp hiện tại, không phụ thuộc khoảng thời gian đang chọn.
          </p>
        </>
      )}
    </div>
  );
}

export default AdminReports;
