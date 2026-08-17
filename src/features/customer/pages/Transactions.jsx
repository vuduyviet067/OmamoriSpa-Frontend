import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyTransactions, getTransactionById } from '@/services/customerService';
import {
  Button,
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal,
} from '@/components/common';
import { formatCurrency } from '@/utils/formatters';

const STATUS_LABELS = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chờ thanh toán',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  FAILED: 'Thanh toán thất bại',
};

const STATUS_VARIANTS = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'error',
  REFUNDED: 'info',
  FAILED: 'error',
};

const PAYMENT_METHOD_LABELS = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
};

const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTransactionCode = (txn) => (
  txn?.invoiceCode
  || txn?.code
  || txn?.invoiceNumber
  || (txn?.id ? `INV-${txn.id}` : '—')
);

const getServiceName = (txn) => (
  txn?.serviceName
  || txn?.appointment?.service?.name
  || txn?.service?.name
  || (txn?.items && txn.items.length === 1 ? txn.items[0]?.name : null)
  || 'Dịch vụ'
);

const getItems = (txn) => {
  if (Array.isArray(txn?.items) && txn.items.length > 0) return txn.items;
  if (Array.isArray(txn?.details) && txn.details.length > 0) return txn.details;
  if (Array.isArray(txn?.lines) && txn.lines.length > 0) return txn.lines;
  if (txn?.appointment?.service) {
    const svc = txn.appointment.service;
    return [{
      name: svc.name,
      type: 'SERVICE',
      quantity: 1,
      unitPrice: svc.price ?? txn.amount ?? 0,
      total: txn.amount ?? svc.price ?? 0,
    }];
  }
  if (txn?.service) {
    return [{
      name: txn.service.name,
      type: 'SERVICE',
      quantity: 1,
      unitPrice: txn.service.price ?? txn.amount ?? 0,
      total: txn.amount ?? txn.service.price ?? 0,
    }];
  }
  return [];
};

const getRoomName = (txn) => pick(
  txn?.roomName,
  txn?.appointment?.room?.name,
  txn?.room?.name,
);

const getStatusKey = (txn) => {
  const raw = (txn?.status || '').toString().toUpperCase();
  return STATUS_LABELS[raw] ? raw : raw || 'PENDING';
};

const getStatusLabel = (statusKey) => STATUS_LABELS[statusKey] || statusKey;

const getStatusVariant = (statusKey) => STATUS_VARIANTS[statusKey] || 'neutral';

const getPaymentMethodLabel = (txn) => {
  const raw = (txn?.paymentMethod || txn?.payment?.method || '').toString().toUpperCase();
  return PAYMENT_METHOD_LABELS[raw] || raw || '—';
};

const getTotal = (txn) => {
  if (typeof txn?.totalAmount === 'number') return txn.totalAmount;
  if (typeof txn?.total === 'number') return txn.total;
  return txn?.amount ?? 0;
};

function CustomerTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTransactions();
      const list = Array.isArray(data)
        ? data
        : (data?.data || data?.items || data?.results || []);
      setTransactions(list);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải lịch sử giao dịch. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const ad = new Date(a?.paidAt || a?.createdAt || a?.date || 0).getTime();
      const bd = new Date(b?.paidAt || b?.createdAt || b?.date || 0).getTime();
      return bd - ad;
    });
  }, [transactions]);

  const openDetail = async (txn) => {
    setDetailTarget(txn);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await getTransactionById(txn.id);
      setDetail(data);
    } catch (err) {
      console.error('Error fetching transaction detail:', err);
      setDetailError(
        err.response?.data?.message
          || err.message
          || 'Không thể tải chi tiết giao dịch.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailTarget(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  if (loading) {
    return <LoadingState message="Đang tải lịch sử giao dịch..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  const mergedDetail = detail || detailTarget;
  const detailItems = getItems(mergedDetail || {});
  const detailRoom = getRoomName(mergedDetail || {});

  return (
    <div>
      <Link to="/customer" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại trang chủ
      </Link>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Lịch sử giao dịch
        </h1>
        <p style={{ color: 'var(--color-charcoal-muted)', marginBottom: 0 }}>
          Các giao dịch đã thực hiện tại Omamori
        </p>
      </div>

      {sortedTransactions.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          title="Bạn chưa có giao dịch nào"
          description="Các giao dịch của bạn sẽ xuất hiện ở đây sau khi hoàn thành dịch vụ tại Omamori."
          action={
            <Link to="/customer/appointments/new">
              <Button>Đặt lịch ngay</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="customer-card transaction-table-card">
            <div className="table-container">
              <table className="table transaction-table">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Ngày thanh toán</th>
                    <th>Dịch vụ / Mỹ phẩm</th>
                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th aria-label="Hành động" />
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((txn) => {
                    const statusKey = getStatusKey(txn);
                    return (
                      <tr
                        key={txn.id}
                        className="transaction-row"
                        onClick={() => openDetail(txn)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDetail(txn);
                          }
                        }}
                      >
                        <td style={{ fontWeight: 500 }}>
                          {getTransactionCode(txn)}
                        </td>
                        <td>
                          {formatDate(txn.paidAt || txn.createdAt || txn.date)}
                        </td>
                        <td>{getServiceName(txn)}</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color:
                              statusKey === 'PAID'
                                ? 'var(--color-success)'
                                : 'var(--color-charcoal)',
                          }}
                        >
                          {formatCurrency(getTotal(txn))}
                        </td>
                        <td>
                          <StatusBadge variant={getStatusVariant(statusKey)}>
                            {getStatusLabel(statusKey)}
                          </StatusBadge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="transaction-row-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(txn);
                            }}
                            aria-label={`Xem chi tiết ${getTransactionCode(txn)}`}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="transaction-cards">
            {sortedTransactions.map((txn) => {
              const statusKey = getStatusKey(txn);
              return (
                <button
                  type="button"
                  key={txn.id}
                  className="transaction-card"
                  onClick={() => openDetail(txn)}
                >
                  <div className="transaction-card-top">
                    <span className="transaction-card-code">
                      {getTransactionCode(txn)}
                    </span>
                    <StatusBadge variant={getStatusVariant(statusKey)}>
                      {getStatusLabel(statusKey)}
                    </StatusBadge>
                  </div>
                  <div className="transaction-card-service">
                    {getServiceName(txn)}
                  </div>
                  <div className="transaction-card-bottom">
                    <span className="transaction-card-date">
                      {formatDate(txn.paidAt || txn.createdAt || txn.date)}
                    </span>
                    <span
                      className={`transaction-card-amount ${
                        statusKey === 'PAID' ? 'paid' : ''
                      }`}
                    >
                      {formatCurrency(getTotal(txn))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Modal
        isOpen={!!detailTarget}
        onClose={closeDetail}
        title={
          detailTarget
            ? `Chi tiết giao dịch ${getTransactionCode(detailTarget)}`
            : 'Chi tiết giao dịch'
        }
        size="lg"
      >
        {detailLoading && (
          <LoadingState message="Đang tải chi tiết giao dịch..." />
        )}

        {!detailLoading && detailError && (
          <div className="booking-alert booking-alert-error" role="alert">
            {detailError}
          </div>
        )}

        {!detailLoading && !detailError && mergedDetail && (
          <div className="transaction-detail">
            <div className="transaction-detail-summary">
              <div className="transaction-detail-row">
                <span className="booking-detail-label">Mã hóa đơn</span>
                <span className="booking-detail-value">
                  {getTransactionCode(mergedDetail)}
                </span>
              </div>
              <div className="transaction-detail-row">
                <span className="booking-detail-label">Ngày thanh toán</span>
                <span className="booking-detail-value">
                  {formatDateTime(
                    mergedDetail.paidAt
                    || mergedDetail.createdAt
                    || mergedDetail.date,
                  )}
                </span>
              </div>
              <div className="transaction-detail-row">
                <span className="booking-detail-label">Trạng thái</span>
                <span className="booking-detail-value">
                  <StatusBadge
                    variant={getStatusVariant(getStatusKey(mergedDetail))}
                  >
                    {getStatusLabel(getStatusKey(mergedDetail))}
                  </StatusBadge>
                </span>
              </div>
              <div className="transaction-detail-row">
                <span className="booking-detail-label">Phương thức thanh toán</span>
                <span className="booking-detail-value">
                  {getPaymentMethodLabel(mergedDetail)}
                </span>
              </div>
              {detailRoom && (
                <div className="transaction-detail-row">
                  <span className="booking-detail-label">Phòng</span>
                  <span className="booking-detail-value">{detailRoom}</span>
                </div>
              )}
            </div>

            <div className="transaction-detail-items">
              <div className="transaction-detail-section-title">
                Dịch vụ &amp; mỹ phẩm
              </div>
              {detailItems.length === 0 ? (
                <p
                  style={{
                    color: 'var(--color-charcoal-muted)',
                    marginBottom: 0,
                  }}
                >
                  Không có dòng sản phẩm nào trong giao dịch này.
                </p>
              ) : (
                <ul className="transaction-detail-list">
                  {detailItems.map((item, idx) => {
                    const qty = item.quantity ?? item.qty ?? 1;
                    const unit = item.unitPrice ?? item.price ?? 0;
                    const total = item.total ?? item.amount ?? qty * unit;
                    const type = (item.type || item.kind || 'SERVICE')
                      .toString()
                      .toUpperCase();
                    return (
                      <li
                        key={`${item.id || item.name || idx}`}
                        className="transaction-detail-item"
                      >
                        <div className="transaction-detail-item-info">
                          <div className="transaction-detail-item-name">
                            {item.name || item.serviceName || item.cosmeticName || 'Sản phẩm'}
                          </div>
                          <div className="transaction-detail-item-meta">
                            <span>{type === 'COSMETIC' ? 'Mỹ phẩm' : 'Dịch vụ'}</span>
                            <span>SL: {qty}</span>
                            <span>Đơn giá: {formatCurrency(unit)}</span>
                          </div>
                        </div>
                        <div className="transaction-detail-item-total">
                          {formatCurrency(total)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="transaction-detail-total">
              <span>Tổng tiền</span>
              <strong>{formatCurrency(getTotal(mergedDetail))}</strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CustomerTransactions;