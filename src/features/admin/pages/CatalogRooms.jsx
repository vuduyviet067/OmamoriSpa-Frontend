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
  Select,
  StatusBadge,
} from '@/components/common';
import { formatCurrency } from '@/utils/formatters';
import {
  createRoom,
  deleteRoom,
  extractApiError,
  getRoomsAdmin,
  isInUseError,
  updateRoom,
} from '@/services/adminService';

const ROOM_TYPES = [
  { value: 'Standard', label: 'Standard' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Massage', label: 'Massage' },
  { value: 'Facial', label: 'Chăm sóc da' },
  { value: 'Body', label: 'Toàn thân' },
];

const ROOM_STATUS_OPTIONS = [
  { value: 'available', label: 'Trống' },
  { value: 'occupied', label: 'Đang sử dụng' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
];

const statusVariant = (status) => {
  switch (status) {
    case 'available':
    case 'active':
      return 'success';
    case 'occupied':
    case 'in_use':
      return 'info';
    case 'maintenance':
      return 'warning';
    case 'inactive':
    case 'disabled':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const statusLabel = (status) => {
  const opt = ROOM_STATUS_OPTIONS.find((o) => o.value === status);
  return opt ? opt.label : status;
};

const normalizeStatus = (room) => {
  if (room.status) return room.status;
  if (typeof room.active === 'boolean') return room.active ? 'available' : 'inactive';
  if (typeof room.isActive === 'boolean') return room.isActive ? 'available' : 'inactive';
  return 'available';
};

function RoomForm({ isOpen, mode, initial, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    name: '',
    type: 'Standard',
    price: '',
    capacity: '2',
    note: '',
    status: 'available',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name || '',
        type: initial.type || initial.roomType || 'Standard',
        price: initial.price !== undefined && initial.price !== null ? String(initial.price) : '',
        capacity:
          initial.capacity !== undefined && initial.capacity !== null
            ? String(initial.capacity)
            : '2',
        note: initial.note || initial.description || '',
        status: normalizeStatus(initial),
      });
    } else {
      setForm({
        name: '',
        type: 'Standard',
        price: '',
        capacity: '2',
        note: '',
        status: 'available',
      });
    }
    setErrors({});
    setGlobalError(null);
  }, [isOpen, initial]);

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = 'Vui lòng nhập tên phòng.';
    if (form.price !== '') {
      const v = Number(form.price);
      if (Number.isNaN(v)) next.price = 'Giá không hợp lệ.';
      else if (v < 0) next.price = 'Giá không được âm.';
    }
    const cap = Number(form.capacity);
    if (!form.capacity || Number.isNaN(cap)) {
      next.capacity = 'Vui lòng nhập sức chứa.';
    } else if (cap <= 0 || !Number.isInteger(cap)) {
      next.capacity = 'Sức chứa phải là số nguyên dương.';
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
        type: form.type,
        price: form.price === '' ? 0 : Number(form.price),
        capacity: Number(form.capacity),
        note: form.note.trim() || undefined,
        status: form.status,
        active: form.status !== 'inactive',
      };
      let saved;
      if (isEdit && initial?.id) {
        saved = await updateRoom(initial.id, payload);
      } else {
        saved = await createRoom(payload);
      }
      if (onSaved) onSaved(saved, isEdit, initial?.id);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể lưu phòng.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Chỉnh sửa phòng' : 'Thêm phòng'}
      size="md"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm phòng'}
          </Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <Input
          label="Tên phòng"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          placeholder="VD: Phòng 1, Phòng VIP A"
          required
          autoFocus
        />
        <div className="admin-form-row">
          <Select
            label="Loại phòng"
            value={form.type}
            onChange={handleChange('type')}
            options={ROOM_TYPES}
            placeholder="Chọn loại"
          />
          <Input
            label="Sức chứa (người)"
            type="number"
            inputMode="numeric"
            min="1"
            value={form.capacity}
            onChange={handleChange('capacity')}
            error={errors.capacity}
            required
          />
        </div>
        <Input
          label="Giá phòng (VND)"
          type="number"
          inputMode="numeric"
          min="0"
          value={form.price}
          onChange={handleChange('price')}
          error={errors.price}
          placeholder="0 = miễn phí"
          helper="Có thể để trống hoặc 0 nếu phòng đã tính trong giá dịch vụ"
        />
        <Select
          label="Trạng thái"
          value={form.status}
          onChange={handleChange('status')}
          options={ROOM_STATUS_OPTIONS}
        />
        <div className="input-group">
          <label htmlFor="room-note" className="input-label">Ghi chú</label>
          <textarea
            id="room-note"
            className="admin-textarea"
            value={form.note}
            onChange={handleChange('note')}
            placeholder="Tiện ích, thiết bị trong phòng, quy định..."
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}

function AdminCatalogRooms() {
  const [rooms, setRooms] = useState([]);
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
      const list = await getRoomsAdmin();
      setRooms(list);
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải danh sách phòng.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q) ||
      (r.note || r.description || '').toLowerCase().includes(q),
    );
  })();

  const handleAdd = () => {
    setEditing(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (room) => {
    setEditing(room);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSaved = (saved, wasEdit, editId) => {
    setFormOpen(false);
    setEditing(null);
    if (wasEdit) {
      setRooms((prev) =>
        prev.map((it) => ((it.id ?? it._id) === editId ? { ...it, ...(saved || {}) } : it)),
      );
    } else if (saved && typeof saved === 'object') {
      const id = saved.id ?? saved._id;
      setRooms((prev) => [{ ...saved, id }, ...prev]);
    }
    load();
  };

  const handleDelete = (room) => {
    setConfirm({
      title: 'Xoá phòng',
      message: `Bạn có chắc chắn muốn xoá "${room.name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const id = room.id ?? room._id;
          await deleteRoom(id);
          setRooms((prev) => prev.filter((it) => (it.id ?? it._id) !== id));
          setConfirm(null);
        } catch (err) {
          if (isInUseError(err)) {
            setGlobalError(extractApiError(err));
          } else {
            setGlobalError(extractApiError(err, 'Không thể xoá phòng.'));
          }
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Danh mục phòng"
        description="Quản lý phòng trị liệu và phòng phụ trợ"
        actions={<Button onClick={handleAdd}>+ Thêm phòng</Button>}
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
            placeholder="Tìm phòng..."
            aria-label="Tìm phòng"
          />
        </div>
        <span className="admin-toolbar-spacer" />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filtered.length}/{rooms.length} phòng
        </span>
      </div>

      <div className="card admin-table-card">
        {loading ? (
          <LoadingState message="Đang tải phòng..." />
        ) : error ? (
          <ErrorState title="Không tải được phòng" message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Không có kết quả' : 'Chưa có phòng'}
            description={search ? 'Thử từ khoá khác.' : 'Bắt đầu bằng cách thêm phòng đầu tiên.'}
            action={!search ? <Button onClick={handleAdd}>+ Thêm phòng</Button> : null}
          />
        ) : (
          <>
            <table className="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Tên phòng</th>
                  <th>Loại</th>
                  <th>Sức chứa</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => {
                  const status = normalizeStatus(room);
                  return (
                    <tr key={room.id ?? room._id}>
                      <td>
                        <div className="admin-table-name">{room.name}</div>
                        {room.note && (
                          <div className="admin-table-sub">
                            {room.note.length > 60 ? `${room.note.slice(0, 60)}...` : room.note}
                          </div>
                        )}
                      </td>
                      <td>{room.type || room.roomType || '-'}</td>
                      <td>{room.capacity ?? '-'} người</td>
                      <td>{formatCurrency(room.price)}</td>
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
                            onClick={() => handleEdit(room)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="admin-table-action-btn admin-table-action-btn--danger"
                            onClick={() => handleDelete(room)}
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
              {filtered.map((room) => {
                const status = normalizeStatus(room);
                return (
                  <div className="admin-table-card-row" key={`m-${room.id ?? room._id}`}>
                    <div className="admin-table-card-row-top">
                      <div>
                        <div className="admin-table-card-row-title">{room.name}</div>
                        <div className="admin-table-card-row-sub">{room.type || room.roomType}</div>
                      </div>
                      <StatusBadge status={statusVariant(status)}>
                        {statusLabel(status)}
                      </StatusBadge>
                    </div>
                    <div className="admin-table-card-row-meta">
                      <span>Sức chứa: {room.capacity ?? '-'} người</span>
                      <span>Giá: {formatCurrency(room.price)}</span>
                    </div>
                    {room.note && (
                      <div className="admin-table-card-row-sub">{room.note}</div>
                    )}
                    <div className="admin-table-card-row-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => handleEdit(room)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn admin-table-action-btn--danger"
                        onClick={() => handleDelete(room)}
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

      <RoomForm
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
        loading={confirmLoading}
      />
    </div>
  );
}

export default AdminCatalogRooms;
