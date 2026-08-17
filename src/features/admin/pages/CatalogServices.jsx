import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/common';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import {
  createService,
  deleteService,
  extractApiError,
  getServicesAdmin,
  isInUseError,
  updateService,
} from '@/services/adminService';

const formatStatus = (service) => {
  if (typeof service.active === 'boolean') return service.active;
  if (typeof service.isActive === 'boolean') return service.isActive;
  if (typeof service.enabled === 'boolean') return service.enabled;
  const s = (service.status || '').toString().toUpperCase();
  if (s === 'INACTIVE' || s === 'DISABLED') return false;
  return true;
};

function ServiceForm({ isOpen, mode, initial, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name || '',
        price: initial.price !== undefined && initial.price !== null ? String(initial.price) : '',
        duration:
          initial.duration !== undefined && initial.duration !== null
            ? String(initial.duration ?? initial.durationMinutes ?? '')
            : '',
        description: initial.description || initial.note || '',
        active: formatStatus(initial),
      });
    } else {
      setForm({ name: '', price: '', duration: '', description: '', active: true });
    }
    setErrors({});
    setGlobalError(null);
  }, [isOpen, initial]);

  const handleChange = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = 'Vui lòng nhập tên dịch vụ.';
    const priceNum = Number(form.price);
    if (form.price === '' || Number.isNaN(priceNum)) {
      next.price = 'Vui lòng nhập giá.';
    } else if (priceNum <= 0) {
      next.price = 'Giá phải lớn hơn 0.';
    }
    const durationNum = Number(form.duration);
    if (form.duration === '' || Number.isNaN(durationNum)) {
      next.duration = 'Vui lòng nhập thời lượng.';
    } else if (durationNum <= 0) {
      next.duration = 'Thời lượng phải lớn hơn 0 phút.';
    } else if (!Number.isInteger(durationNum)) {
      next.duration = 'Thời lượng phải là số nguyên (phút).';
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
        name: form.name.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        description: form.description.trim() || undefined,
        active: !!form.active,
      };
      let saved;
      if (isEdit && initial?.id) {
        saved = await updateService(initial.id, payload);
      } else {
        saved = await createService(payload);
      }
      if (onSaved) onSaved(saved, isEdit, initial?.id);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể lưu dịch vụ.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}
      size="md"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
          </Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <Input
          label="Tên dịch vụ"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          placeholder="VD: Massage body toàn thân"
          required
          autoFocus
        />
        <div className="admin-form-row">
          <Input
            label="Giá (VND)"
            type="number"
            inputMode="numeric"
            min="0"
            value={form.price}
            onChange={handleChange('price')}
            error={errors.price}
            placeholder="450000"
            required
          />
          <Input
            label="Thời lượng (phút)"
            type="number"
            inputMode="numeric"
            min="1"
            value={form.duration}
            onChange={handleChange('duration')}
            error={errors.duration}
            placeholder="90"
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="service-desc" className="input-label">Mô tả / ghi chú</label>
          <textarea
            id="service-desc"
            className="admin-textarea"
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Mô tả ngắn về dịch vụ, công dụng, lưu ý..."
            rows={3}
          />
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={handleChange('active')}
          />
          Đang hoạt động (hiển thị cho khách hàng chọn lịch)
        </label>
      </form>
    </Modal>
  );
}

function AdminCatalogServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editing, setEditing] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getServicesAdmin();
      setServices(list);
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải danh sách dịch vụ.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q),
    );
  })();

  const handleAdd = () => {
    setEditing(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSaved = (saved, wasEdit, editId) => {
    setFormOpen(false);
    setEditing(null);
    if (wasEdit) {
      setServices((prev) =>
        prev.map((it) => ((it.id ?? it._id) === editId ? { ...it, ...(saved || {}) } : it)),
      );
    } else if (saved && typeof saved === 'object') {
      const id = saved.id ?? saved._id;
      setServices((prev) => [{ ...saved, id }, ...prev]);
    }
    load();
  };

  const handleDelete = (svc) => {
    setConfirm({
      title: 'Xoá dịch vụ',
      message: `Bạn có chắc chắn muốn xoá "${svc.name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const id = svc.id ?? svc._id;
          await deleteService(id);
          setServices((prev) => prev.filter((it) => (it.id ?? it._id) !== id));
          setConfirm(null);
        } catch (err) {
          if (isInUseError(err)) {
            // Surface backend's business-rule message verbatim
            setGlobalError(extractApiError(err));
          } else {
            setGlobalError(extractApiError(err, 'Không thể xoá dịch vụ.'));
          }
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const toggleConfirm = (svc) => {
    const active = formatStatus(svc);
    setConfirm({
      title: active ? 'Ngừng hoạt động dịch vụ' : 'Kích hoạt dịch vụ',
      message: `Bạn có chắc chắn muốn ${active ? 'ngừng hoạt động' : 'kích hoạt'} "${svc.name}"?`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const id = svc.id ?? svc._id;
          await updateService(id, { ...svc, active: !active });
          setServices((prev) =>
            prev.map((it) => ((it.id ?? it._id) === id ? { ...it, active: !active } : it)),
          );
          setConfirm(null);
        } catch (err) {
          setGlobalError(extractApiError(err, 'Không thể cập nhật trạng thái.'));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Danh mục dịch vụ"
        description="Quản lý các dịch vụ spa hiển thị cho khách hàng"
        actions={<Button onClick={handleAdd}>+ Thêm dịch vụ</Button>}
      />

      {globalError && (
        <div className="admin-form-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {globalError}
        </div>
      )}

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
            placeholder="Tìm dịch vụ..."
            aria-label="Tìm dịch vụ"
          />
        </div>
        <span className="admin-toolbar-spacer" />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filtered.length}/{services.length} dịch vụ
        </span>
      </div>

      <div className="card admin-table-card">
        {loading ? (
          <LoadingState message="Đang tải dịch vụ..." />
        ) : error ? (
          <ErrorState title="Không tải được dịch vụ" message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Không có kết quả' : 'Chưa có dịch vụ nào'}
            description={search ? 'Thử từ khoá khác.' : 'Bắt đầu bằng cách thêm dịch vụ đầu tiên.'}
            action={!search ? <Button onClick={handleAdd}>+ Thêm dịch vụ</Button> : null}
          />
        ) : (
          <>
            <table className="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Tên dịch vụ</th>
                  <th>Thời lượng</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc) => {
                  const active = formatStatus(svc);
                  return (
                    <tr key={svc.id ?? svc._id}>
                      <td>
                        <div className="admin-table-name">{svc.name}</div>
                        {svc.description && (
                          <div className="admin-table-sub">
                            {svc.description.length > 60
                              ? `${svc.description.slice(0, 60)}...`
                              : svc.description}
                          </div>
                        )}
                      </td>
                      <td>{formatDuration(svc.duration ?? svc.durationMinutes ?? 0)}</td>
                      <td>{formatCurrency(svc.price)}</td>
                      <td>
                        <StatusBadge status={active ? 'success' : 'neutral'}>
                          {active ? 'Hoạt động' : 'Ngừng'}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-table-action-btn"
                            onClick={() => handleEdit(svc)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="admin-table-action-btn"
                            onClick={() => toggleConfirm(svc)}
                          >
                            {active ? 'Ngừng' : 'Kích hoạt'}
                          </button>
                          <button
                            type="button"
                            className="admin-table-action-btn admin-table-action-btn--danger"
                            onClick={() => handleDelete(svc)}
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="admin-table-cards">
              {filtered.map((svc) => {
                const active = formatStatus(svc);
                return (
                  <div className="admin-table-card-row" key={`m-${svc.id ?? svc._id}`}>
                    <div className="admin-table-card-row-top">
                      <div className="admin-table-card-row-title">{svc.name}</div>
                      <StatusBadge status={active ? 'success' : 'neutral'}>
                        {active ? 'Hoạt động' : 'Ngừng'}
                      </StatusBadge>
                    </div>
                    {svc.description && (
                      <div className="admin-table-card-row-sub">{svc.description}</div>
                    )}
                    <div className="admin-table-card-row-meta">
                      <span>Thời lượng: {formatDuration(svc.duration ?? svc.durationMinutes ?? 0)}</span>
                      <span>Giá: {formatCurrency(svc.price)}</span>
                    </div>
                    <div className="admin-table-card-row-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => handleEdit(svc)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => toggleConfirm(svc)}
                      >
                        {active ? 'Ngừng' : 'Kích hoạt'}
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn admin-table-action-btn--danger"
                        onClick={() => handleDelete(svc)}
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ServiceForm
        isOpen={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => !confirmLoading && setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        variant="danger"
        confirmText="Xác nhận"
        loading={confirmLoading}
      />
    </div>
  );
}

export default AdminCatalogServices;
