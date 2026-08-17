import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@/components/common';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { getInitials } from '@/utils/formatters';
import {
  getCustomers,
  getTherapistsAdmin,
  updateCustomerStatus,
  updateTherapistStatus,
  extractApiError,
} from '@/services/adminService';
import TherapistForm from '../components/TherapistForm';
import UserDetailModal from '../components/UserDetailModal';

const TABS = [
  { id: 'customers', label: 'Khách hàng' },
  { id: 'therapists', label: 'Kỹ thuật viên' },
];

// ---------- helpers -------------------------------------------------
const normalizeStatus = (item) => {
  if (typeof item?.active === 'boolean') return item.active ? 'active' : 'inactive';
  if (typeof item?.isActive === 'boolean') return item.isActive ? 'active' : 'inactive';
  if (typeof item?.enabled === 'boolean') return item.enabled ? 'active' : 'inactive';
  const raw = (item?.status || '').toString().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'ENABLED' || raw === 'ON') return 'active';
  if (raw === 'INACTIVE' || raw === 'DISABLED' || raw === 'OFF') return 'inactive';
  return 'active'; // default - safer for KTV/admin views
};

const statusVariant = (status) =>
  status === 'active' ? 'success' : 'neutral';

const statusLabel = (status) =>
  status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa';

const filterByQuery = (rows, query, fields) => {
  if (!query) return rows;
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((f) => String(row[f] ?? '').toLowerCase().includes(q)),
  );
};

// ---------- Sub-components --------------------------------------------
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="admin-search">
      <span className="admin-search-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm kiếm"
      />
    </div>
  );
}

function UserAvatar({ user }) {
  const name = user?.name || user?.fullName || '?';
  return (
    <div className="admin-user-cell">
      <span className="admin-avatar">{getInitials(name)}</span>
      <div className="admin-user-cell-text">
        <div className="admin-user-cell-name">{name}</div>
        <div className="admin-user-cell-sub">{user?.email || '-'}</div>
      </div>
    </div>
  );
}

function CustomerTable({ rows, onView, onToggleStatus, toggling }) {
  if (rows.length === 0) return null;
  return (
    <>
      {/* Desktop table */}
      <table className="admin-table admin-table-desktop">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Số điện thoại</th>
            <th>Ngày tham gia</th>
            <th>Trạng thái</th>
            <th style={{ textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const status = normalizeStatus(c);
            return (
              <tr key={c.id ?? c._id}>
                <td>
                  <UserAvatar user={c} />
                </td>
                <td>{c.phone || c.phoneNumber || '-'}</td>
                <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                <td>
                  <StatusBadge status={statusVariant(status)}>
                    {statusLabel(status)}
                  </StatusBadge>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-table-action-btn"
                      onClick={() => onView(c)}
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      className={status === 'active' ? 'admin-table-action-btn admin-table-action-btn--danger' : 'admin-table-action-btn'}
                      onClick={() => onToggleStatus(c, status)}
                      disabled={toggling === (c.id ?? c._id)}
                    >
                      {status === 'active' ? 'Vô hiệu hóa' : 'Mở lại'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="admin-table-cards">
        {rows.map((c) => {
          const status = normalizeStatus(c);
          return (
            <div className="admin-table-card-row" key={`m-${c.id ?? c._id}`}>
              <div className="admin-table-card-row-top">
                <UserAvatar user={c} />
                <StatusBadge status={statusVariant(status)}>
                  {statusLabel(status)}
                </StatusBadge>
              </div>
              <div className="admin-table-card-row-meta">
                <span>SĐT: {c.phone || c.phoneNumber || '-'}</span>
                <span>Ngày tham gia: {c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '-'}</span>
              </div>
              <div className="admin-table-card-row-actions">
                <button
                  type="button"
                  className="admin-table-action-btn"
                  onClick={() => onView(c)}
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  className={status === 'active' ? 'admin-table-action-btn admin-table-action-btn--danger' : 'admin-table-action-btn'}
                  onClick={() => onToggleStatus(c, status)}
                  disabled={toggling === (c.id ?? c._id)}
                >
                  {status === 'active' ? 'Vô hiệu hóa' : 'Mở lại'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TherapistTable({ rows, onView, onEdit, onToggleStatus, toggling }) {
  if (rows.length === 0) return null;
  return (
    <>
      <table className="admin-table admin-table-desktop">
        <thead>
          <tr>
            <th>Kỹ thuật viên</th>
            <th>Chuyên môn</th>
            <th>Số điện thoại</th>
            <th>Trạng thái</th>
            <th style={{ textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const status = normalizeStatus(t);
            return (
              <tr key={t.id ?? t._id}>
                <td>
                  <UserAvatar user={t} />
                </td>
                <td>{t.specialty || t.expertise || '-'}</td>
                <td>{t.phone || t.phoneNumber || '-'}</td>
                <td>
                  <StatusBadge status={statusVariant(status)}>
                    {statusLabel(status)}
                  </StatusBadge>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-table-action-btn" onClick={() => onView(t)}>
                      Xem
                    </button>
                    <button type="button" className="admin-table-action-btn" onClick={() => onEdit(t)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className={status === 'active' ? 'admin-table-action-btn admin-table-action-btn--danger' : 'admin-table-action-btn'}
                      onClick={() => onToggleStatus(t, status)}
                      disabled={toggling === (t.id ?? t._id)}
                    >
                      {status === 'active' ? 'Vô hiệu hóa' : 'Mở lại'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="admin-table-cards">
        {rows.map((t) => {
          const status = normalizeStatus(t);
          return (
            <div className="admin-table-card-row" key={`m-${t.id ?? t._id}`}>
              <div className="admin-table-card-row-top">
                <UserAvatar user={t} />
                <StatusBadge status={statusVariant(status)}>
                  {statusLabel(status)}
                </StatusBadge>
              </div>
              <div className="admin-table-card-row-meta">
                <span>Chuyên môn: {t.specialty || t.expertise || '-'}</span>
                <span>SĐT: {t.phone || t.phoneNumber || '-'}</span>
              </div>
              <div className="admin-table-card-row-actions">
                <button type="button" className="admin-table-action-btn" onClick={() => onView(t)}>
                  Xem
                </button>
                <button type="button" className="admin-table-action-btn" onClick={() => onEdit(t)}>
                  Sửa
                </button>
                <button
                  type="button"
                  className={status === 'active' ? 'admin-table-action-btn admin-table-action-btn--danger' : 'admin-table-action-btn'}
                  onClick={() => onToggleStatus(t, status)}
                  disabled={toggling === (t.id ?? t._id)}
                >
                  {status === 'active' ? 'Vô hiệu hóa' : 'Mở lại'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------- Page -----------------------------------------------------
function AdminUsers() {
  const [tab, setTab] = useState('customers');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // customers
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersError, setCustomersError] = useState(null);

  // therapists
  const [therapists, setTherapists] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(true);
  const [therapistsError, setTherapistsError] = useState(null);

  // detail modal
  const [viewing, setViewing] = useState(null);

  // therapist form modal
  const [therapistFormOpen, setTherapistFormOpen] = useState(false);
  const [therapistFormMode, setTherapistFormMode] = useState('create');
  const [editingTherapist, setEditingTherapist] = useState(null);

  // confirm dialog (status toggle)
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // track in-flight status update by id to disable that row's button
  const [toggling, setToggling] = useState(null);

  // flash for explicit errors
  const [globalError, setGlobalError] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomersError(null);
    try {
      const list = await getCustomers();
      setCustomers(list);
    } catch (err) {
      setCustomersError(extractApiError(err, 'Không thể tải danh sách khách hàng.'));
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const loadTherapists = useCallback(async () => {
    setLoadingTherapists(true);
    setTherapistsError(null);
    try {
      const list = await getTherapistsAdmin();
      setTherapists(list);
    } catch (err) {
      setTherapistsError(extractApiError(err, 'Không thể tải danh sách kỹ thuật viên.'));
    } finally {
      setLoadingTherapists(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadTherapists();
  }, [loadCustomers, loadTherapists]);

  const filteredCustomers = useMemo(
    () => filterByQuery(customers, debouncedSearch, ['name', 'fullName', 'email', 'phone', 'phoneNumber', 'username']),
    [customers, debouncedSearch],
  );

  const filteredTherapists = useMemo(
    () => filterByQuery(therapists, debouncedSearch, ['name', 'fullName', 'email', 'phone', 'phoneNumber', 'username', 'specialty', 'expertise']),
    [therapists, debouncedSearch],
  );

  const handleView = (user) => setViewing({ user, role: tab === 'therapists' ? 'therapist' : 'customer' });

  const handleToggleStatus = (target, currentStatus) => {
    const id = target.id ?? target._id;
    if (!id) {
      setGlobalError('Không xác định được bản ghi để cập nhật.');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = currentStatus === 'active' ? 'vô hiệu hóa' : 'mở lại';
    const entity = tab === 'therapists' ? 'kỹ thuật viên' : 'khách hàng';
    setConfirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}?`,
      message: `Bạn có chắc chắn muốn ${action} cho ${
        target.name || target.fullName || 'bản ghi này'
      }?`,
      variant: currentStatus === 'active' ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmLoading(true);
        setToggling(id);
        try {
          if (tab === 'therapists') {
            await updateTherapistStatus(id, nextStatus);
          } else {
            await updateCustomerStatus(id, nextStatus);
          }
          if (tab === 'therapists') {
            setTherapists((prev) =>
              prev.map((it) =>
                (it.id ?? it._id) === id ? { ...it, status: nextStatus, active: nextStatus === 'active' } : it,
              ),
            );
          } else {
            setCustomers((prev) =>
              prev.map((it) =>
                (it.id ?? it._id) === id ? { ...it, status: nextStatus, active: nextStatus === 'active' } : it,
              ),
            );
          }
          setConfirm(null);
        } catch (err) {
          setGlobalError(extractApiError(err, 'Không thể cập nhật trạng thái tài khoản.'));
        } finally {
          setToggling(null);
          setConfirmLoading(false);
        }
      },
    });
  };

  const openCreateTherapist = () => {
    setEditingTherapist(null);
    setTherapistFormMode('create');
    setTherapistFormOpen(true);
  };

  const openEditTherapist = (therapist) => {
    setEditingTherapist(therapist);
    setTherapistFormMode('edit');
    setTherapistFormOpen(true);
  };

  const handleTherapistSaved = (saved) => {
    if (therapistFormMode === 'create') {
      // Prepend optimistic record; the API response may or may not contain id yet
      const record = saved && typeof saved === 'object'
        ? { ...saved, id: saved?.id ?? saved?._id ?? saved?.user?.id }
        : null;
      setTherapists((prev) => (record ? [record, ...prev] : prev));
    } else {
      // Replace updated record
      setTherapists((prev) =>
        prev.map((it) =>
          (it.id ?? it._id) === (editingTherapist?.id ?? editingTherapist?._id)
            ? { ...it, ...(saved || {}) }
            : it,
        ),
      );
    }
    setTherapistFormOpen(false);
    setEditingTherapist(null);
    // Best-effort refresh
    loadTherapists();
  };

  const isCustomers = tab === 'customers';
  const isTherapists = tab === 'therapists';

  return (
    <div>
      <PageHeader
        title="Người dùng & nhân sự"
        description="Quản lý khách hàng và kỹ thuật viên trong hệ thống"
        actions={
          isTherapists ? (
            <Button onClick={openCreateTherapist}>+ Thêm kỹ thuật viên</Button>
          ) : null
        }
      />

      {globalError && (
        <div className="admin-form-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {globalError}
        </div>
      )}

      <div className="admin-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-charcoal-muted)' }}>
              {t.id === 'customers' ? `(${customers.length})` : `(${therapists.length})`}
            </span>
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={
            isCustomers ? 'Tìm theo tên, email, SĐT, tên đăng nhập...' : 'Tìm theo tên, email, chuyên môn...'
          }
        />
        <span className="admin-toolbar-spacer" />
        {isCustomers && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filteredCustomers.length}/{customers.length} khách hàng
        </span>}
        {isTherapists && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filteredTherapists.length}/{therapists.length} kỹ thuật viên
        </span>}
      </div>

      {isCustomers && (
        <div className="card admin-table-card">
          {loadingCustomers ? (
            <LoadingState message="Đang tải khách hàng..." />
          ) : customersError ? (
            <ErrorState
              title="Không tải được khách hàng"
              message={customersError}
              onRetry={loadCustomers}
            />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              title={search ? 'Không có kết quả' : 'Chưa có khách hàng'}
              description={search ? 'Thử từ khoá khác hoặc xoá bộ lọc.' : 'Hệ thống chưa có khách hàng nào.'}
            />
          ) : (
            <CustomerTable
              rows={filteredCustomers}
              onView={handleView}
              onToggleStatus={handleToggleStatus}
              toggling={toggling}
            />
          )}
        </div>
      )}

      {isTherapists && (
        <div className="card admin-table-card">
          {loadingTherapists ? (
            <LoadingState message="Đang tải kỹ thuật viên..." />
          ) : therapistsError ? (
            <ErrorState
              title="Không tải được kỹ thuật viên"
              message={therapistsError}
              onRetry={loadTherapists}
            />
          ) : filteredTherapists.length === 0 ? (
            <EmptyState
              title={search ? 'Không có kết quả' : 'Chưa có kỹ thuật viên'}
              description={
                search
                  ? 'Thử từ khoá khác hoặc xoá bộ lọc.'
                  : 'Bắt đầu bằng cách thêm kỹ thuật viên đầu tiên.'
              }
              action={!search ? <Button onClick={openCreateTherapist}>+ Thêm kỹ thuật viên</Button> : null}
            />
          ) : (
            <TherapistTable
              rows={filteredTherapists}
              onView={handleView}
              onEdit={openEditTherapist}
              onToggleStatus={handleToggleStatus}
              toggling={toggling}
            />
          )}
        </div>
      )}

      {/* Therapist add/edit modal */}
      <TherapistForm
        isOpen={therapistFormOpen}
        mode={therapistFormMode}
        initial={editingTherapist}
        onClose={() => {
          setTherapistFormOpen(false);
          setEditingTherapist(null);
        }}
        onSaved={handleTherapistSaved}
      />

      {/* Detail modal (shared between customer & therapist) */}
      <UserDetailModal
        isOpen={!!viewing}
        user={viewing?.user}
        role={viewing?.role}
        onClose={() => setViewing(null)}
      />

      {/* Confirm status toggle */}
      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => !confirmLoading && setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        variant={confirm?.variant === 'danger' ? 'danger' : 'primary'}
        confirmText={confirm?.variant === 'danger' ? 'Vô hiệu hóa' : 'Mở lại'}
        loading={confirmLoading}
      />
    </div>
  );
}

export default AdminUsers;
