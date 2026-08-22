import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Image,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/common';
import { formatCurrency } from '@/utils/formatters';
import {
  createCosmetic,
  deleteCosmetic,
  extractApiError,
  getCosmeticsAdmin,
  isInUseError,
  updateCosmetic,
} from '@/services/adminService';

const formatStatus = (item) => {
  // Backend (cosmetic-service) returns `stockQuantity` (computed from
  // CosmeticInventory). Mock seed and older payloads may use `stock` /
  // `inventory` - check them in order so both work.
  const stock = Number(item.stockQuantity ?? item.stock ?? item.inventory ?? 0);
  if (item.status) return item.status;
  if (stock <= 0) return 'out_of_stock';
  if (item.minStock !== undefined && stock <= Number(item.minStock)) return 'low_stock';
  return 'in_stock';
};

const stockVariant = (status) => {
  switch (status) {
    case 'in_stock':
      return 'success';
    case 'low_stock':
      return 'warning';
    case 'out_of_stock':
      return 'error';
    default:
      return 'neutral';
  }
};

const stockLabel = (status) => {
  switch (status) {
    case 'in_stock':
      return 'Còn hàng';
    case 'low_stock':
      return 'Sắp hết';
    case 'out_of_stock':
      return 'Hết hàng';
    default:
      return status;
  }
};

function CosmeticForm({ isOpen, mode, initial, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    name: '',
    brand: '',
    manufacturer: '',
    price: '',
    description: '',
    image: '',
    initialQuantity: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name || '',
        brand: initial.brand || '',
        manufacturer: initial.manufacturer || initial.madeBy || '',
        price: initial.price !== undefined && initial.price !== null ? String(initial.price) : '',
        description: initial.description || initial.note || '',
        image: initial.image || initial.imageUrl || initial.mediaUrl || '',
        initialQuantity: '',
      });
    } else {
      setForm({
        name: '',
        brand: '',
        manufacturer: '',
        price: '',
        description: '',
        image: '',
        initialQuantity: '',
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
    if (!form.name?.trim()) next.name = 'Vui lòng nhập tên sản phẩm.';
    const priceNum = Number(form.price);
    if (form.price === '' || Number.isNaN(priceNum)) {
      next.price = 'Vui lòng nhập giá.';
    } else if (priceNum < 0) {
      next.price = 'Giá không được âm.';
    }
    // SoLuongBanDau chi ap dung khi tao moi. CREATE-only - sua my pham
    // khong cham vao stock (dung flow Nhap kho rieng cho sua stock).
    if (!isEdit) {
      if (form.initialQuantity === '') {
        next.initialQuantity = 'Vui lòng nhập số lượng ban đầu.';
      } else {
        const v = Number(form.initialQuantity);
        if (Number.isNaN(v) || v < 0 || !Number.isInteger(v)) {
          next.initialQuantity = 'Số lượng ban đầu phải là số nguyên ≥ 0.';
        }
      }
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
        brand: form.brand.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        price: Number(form.price),
        description: form.description.trim() || undefined,
        // image: send multiple keys so backend can pick whichever it understands
        image: form.image.trim() || undefined,
        imageUrl: form.image.trim() || undefined,
        mediaUrl: form.image.trim() || undefined,
      };
      // Chi gui so luong ban dau khi tao moi. Edit khong cham vao stock -
      // admin can dung flow Nhap kho rieng de dieu chinh ton kho sau.
      if (!isEdit) {
        payload.initialQuantity = Number(form.initialQuantity);
      }
      let saved;
      if (isEdit && initial?.id) {
        saved = await updateCosmetic(initial.id, payload);
      } else {
        saved = await createCosmetic(payload);
      }
      if (onSaved) onSaved(saved, isEdit, initial?.id);
    } catch (err) {
      setGlobalError(extractApiError(err, 'Không thể lưu mỹ phẩm.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Chỉnh sửa mỹ phẩm' : 'Thêm mỹ phẩm'}
      size="lg"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mỹ phẩm'}
          </Button>
        </>
      )}
    >
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        {globalError && (
          <div className="admin-form-error" role="alert">{globalError}</div>
        )}
        <Input
          label="Tên mỹ phẩm"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          placeholder="VD: Tinh dầu massage lavender"
          required
          autoFocus
        />
        <div className="admin-form-row">
          <Input
            label="Thương hiệu"
            value={form.brand}
            onChange={handleChange('brand')}
            placeholder="Omamori, Ohui,..."
          />
          <Input
            label="Nhà sản xuất"
            value={form.manufacturer}
            onChange={handleChange('manufacturer')}
            placeholder="Công ty TNHH..."
          />
        </div>
        <Input
          label="Giá bán (VND)"
          type="number"
          inputMode="numeric"
          min="0"
          value={form.price}
          onChange={handleChange('price')}
          error={errors.price}
          required
        />
        {!isEdit && (
          <Input
            label="Số lượng ban đầu"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={form.initialQuantity}
            onChange={handleChange('initialQuantity')}
            error={errors.initialQuantity}
            placeholder="0"
            required
            helper="Số lượng tồn kho ban đầu. Sau khi tạo, dùng chức năng Nhập kho để bổ sung thêm lô."
          />
        )}
        <Input
          label="URL hình ảnh"
          value={form.image}
          onChange={handleChange('image')}
          placeholder="https://..."
          helper="Hệ thống sẽ dùng URL này nếu Media Service hỗ trợ"
        />
        {form.image && (
          <div className="admin-image-preview">
            <span className="admin-image-preview-thumb">
              <Image src={form.image} alt={form.name || 'preview'} type="cosmetic" />
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
              Xem trước hình ảnh
            </span>
          </div>
        )}
        <div className="input-group">
          <label htmlFor="cosmetic-desc" className="input-label">Mô tả</label>
          <textarea
            id="cosmetic-desc"
            className="admin-textarea"
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Thành phần, công dụng, hướng dẫn sử dụng..."
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}

function AdminCatalogCosmetics() {
  const [cosmetics, setCosmetics] = useState([]);
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
      const list = await getCosmeticsAdmin();
      setCosmetics(list);
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải danh sách mỹ phẩm.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return cosmetics;
    return cosmetics.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.brand || '').toLowerCase().includes(q) ||
      (c.manufacturer || '').toLowerCase().includes(q),
    );
  })();

  const handleAdd = () => {
    setEditing(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSaved = (saved, wasEdit, editId) => {
    setFormOpen(false);
    setEditing(null);
    if (wasEdit) {
      setCosmetics((prev) =>
        prev.map((it) => ((it.id ?? it._id) === editId ? { ...it, ...(saved || {}) } : it)),
      );
    } else if (saved && typeof saved === 'object') {
      const id = saved.id ?? saved._id;
      setCosmetics((prev) => [{ ...saved, id }, ...prev]);
    }
    load();
  };

  const handleDelete = (item) => {
    setConfirm({
      title: 'Xoá mỹ phẩm',
      message: `Bạn có chắc chắn muốn xoá "${item.name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const id = item.id ?? item._id;
          await deleteCosmetic(id);
          setCosmetics((prev) => prev.filter((it) => (it.id ?? it._id) !== id));
          setConfirm(null);
        } catch (err) {
          if (isInUseError(err)) {
            setGlobalError(extractApiError(err));
          } else {
            setGlobalError(extractApiError(err, 'Không thể xoá mỹ phẩm.'));
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
        title="Danh mục mỹ phẩm"
        description="Quản lý sản phẩm mỹ phẩm sử dụng trong spa"
        actions={<Button onClick={handleAdd}>+ Thêm mỹ phẩm</Button>}
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
            placeholder="Tìm mỹ phẩm..."
            aria-label="Tìm mỹ phẩm"
          />
        </div>
        <span className="admin-toolbar-spacer" />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          {filtered.length}/{cosmetics.length} sản phẩm
        </span>
      </div>

      <div className="card admin-table-card">
        {loading ? (
          <LoadingState message="Đang tải mỹ phẩm..." />
        ) : error ? (
          <ErrorState title="Không tải được mỹ phẩm" message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Không có kết quả' : 'Chưa có mỹ phẩm'}
            description={search ? 'Thử từ khoá khác.' : 'Bắt đầu bằng cách thêm sản phẩm đầu tiên.'}
            action={!search ? <Button onClick={handleAdd}>+ Thêm mỹ phẩm</Button> : null}
          />
        ) : (
          <>
            <table className="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th style={{ width: '64px' }}></th>
                  <th>Sản phẩm</th>
                  <th>Thương hiệu</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = formatStatus(item);
                  const image = item.image || item.imageUrl || item.mediaUrl;
                  return (
                    <tr key={item.id ?? item._id}>
                      <td>
                        <span className="admin-image-preview-thumb" style={{ width: 48, height: 48 }}>
                          <Image src={image} alt={item.name} type="cosmetic" />
                        </span>
                      </td>
                      <td>
                        <div className="admin-table-name">{item.name}</div>
                        {item.manufacturer && (
                          <div className="admin-table-sub">NSX: {item.manufacturer}</div>
                        )}
                      </td>
                      <td>{item.brand || '-'}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{item.stockQuantity ?? item.stock ?? 0}</span>
                          <StatusBadge status={stockVariant(status)}>
                            {stockLabel(status)}
                          </StatusBadge>
                        </div>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-table-action-btn"
                            onClick={() => handleEdit(item)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="admin-table-action-btn admin-table-action-btn--danger"
                            onClick={() => handleDelete(item)}
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
              {filtered.map((item) => {
                const status = formatStatus(item);
                const image = item.image || item.imageUrl || item.mediaUrl;
                return (
                  <div className="admin-table-card-row" key={`m-${item.id ?? item._id}`}>
                    <div className="admin-table-card-row-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="admin-image-preview-thumb" style={{ width: 48, height: 48 }}>
                          <Image src={image} alt={item.name} type="cosmetic" />
                        </span>
                        <div>
                          <div className="admin-table-card-row-title">{item.name}</div>
                          <div className="admin-table-card-row-sub">
                            {item.brand || '-'}
                            {item.manufacturer ? ` - ${item.manufacturer}` : ''}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={stockVariant(status)}>
                        {stockLabel(status)}
                      </StatusBadge>
                    </div>
                    <div className="admin-table-card-row-meta">
                      <span>Giá: {formatCurrency(item.price)}</span>
                      <span>Tồn kho: {item.stockQuantity ?? item.stock ?? 0}</span>
                    </div>
                    <div className="admin-table-card-row-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn"
                        onClick={() => handleEdit(item)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn admin-table-action-btn--danger"
                        onClick={() => handleDelete(item)}
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

      <CosmeticForm
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

export default AdminCatalogCosmetics;
