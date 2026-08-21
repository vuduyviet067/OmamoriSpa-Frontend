// Admin API Service
// Centralises all admin-scope API calls (UC09, UC10, UC11, UC12):
//   - /admin/dashboard (overview)
//   - /admin/customers (UC09)
//   - /admin/therapists (UC09 - incl. create/update)
//   - /rooms/, /admin/rooms, /admin/cosmetics (UC10)
//   - /treatments/ (P2-B1: Admin Catalog - Services via treatment-service)
//   - /admin/inventory (UC10/UC11)
//   - /admin/invoices, /admin/invoices/pay (UC11)
//   - /admin/reports (UC12)
//
// When VITE_USE_MOCK_DATA=true the service bypasses the network and operates
// against an in-memory mock layer (src/mocks/admin.js). Mock and real flows
// are deliberately separate so backend integration will swap implementations
// without touching pages.
//
// Admin → Danh mục → Dịch vụ has its own dedicated toggle
// VITE_USE_MOCK_ADMIN_CATALOG_SERVICES so the rest of admin can stay on mocks
// while this view integrates with the real treatment-service.
//
// Admin → Danh mục → Phòng has its own dedicated toggle
// VITE_USE_MOCK_ADMIN_CATALOG_ROOMS so the rest of admin can stay on mocks
// while this view integrates with the real room-service.

import apiClient from './api';
import {
  adminCustomers as _customersSeed,
  adminTherapists as _therapistsSeed,
  adminAppointments as _appointmentsSeed,
  adminInvoices as _invoicesSeed,
  adminInventory as _inventorySeed,
  computeDashboardOverview,
  computeReport,
} from '@/mocks/admin';
import { services as catalogServices } from '@/mocks/services';
import { rooms as catalogRooms } from '@/mocks/rooms';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const USE_MOCK_ADMIN_USERS =
  import.meta.env.VITE_USE_MOCK_ADMIN_USERS === 'true';
// Dedicated flag so Admin → Danh mục → Dịch vụ can hit the real
// treatment-service backend without flipping the global mock flag,
// which still keeps Room/Cosmetic/Invoice/Report on mocks.
const USE_MOCK_ADMIN_CATALOG_SERVICES =
  import.meta.env.VITE_USE_MOCK_ADMIN_CATALOG_SERVICES === 'true';
// Dedicated flag so Admin → Danh mục → Phòng can hit the real room-service
// backend without flipping the global mock flag, which still keeps
// Cosmetic / Invoice / Report on mocks.
const USE_MOCK_ADMIN_CATALOG_ROOMS =
  import.meta.env.VITE_USE_MOCK_ADMIN_CATALOG_ROOMS === 'true';

// ---- shared helpers (mirrors customerService / therapistService) ------
const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.result)) return payload.result;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const extractObject = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (
      payload.result
      && typeof payload.result === 'object'
      && !Array.isArray(payload.result)
    ) {
      return payload.result;
    }

    if (
      payload.data
      && typeof payload.data === 'object'
      && !Array.isArray(payload.data)
    ) {
      return payload.data;
    }

    return payload;
  }

  return null;
};

// Soft-fail 404 to []. Other errors propagate so the page can render its
// error state with context (admin crash should be visible, not silent).
const safeList = async (promise) => {
  try {
    const res = await promise;
    return extractList(res.data);
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
};

// ---- in-memory mock store (persists across page navigation in the same tab) ---
const _delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const _customers = [..._customersSeed];
const _therapists = [..._therapistsSeed];
const _invoices = [..._invoicesSeed];
const _inventory = _inventorySeed.map((row) => ({
  ...row,
  lots: (row.lots || []).map((l) => ({ ...l })),
}));
let _nextTherapistId = 10000;
let _nextInvoiceId = 10000;

// =========================================================
// Error helpers
// =========================================================

/**
 * Extract a user-facing message from an axios error.
 * Honours the backend's `message` / `error` fields before falling back.
 */
export const extractApiError = (err, fallback) => {
  if (!err) return fallback || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const data = err.response?.data || {};
  return (
    data.message
    || data.error
    || err.message
    || fallback
    || 'Đã xảy ra lỗi. Vui lòng thử lại.'
  );
};

/**
 * Detect a "duplicate / already exists" error.
 * Used to surface "Thông tin nhân sự đã tồn tại trên hệ thống." inline.
 */
export const isDuplicateError = (err) => {
  if (!err) return false;
  const status = err.response?.status;
  if (status === 409 || status === 422) return true;
  const code = err.response?.data?.code || err.response?.data?.errorCode;
  if (typeof code === 'string' && /duplicate|unique|conflict|exists|already/i.test(code)) return true;
  const message = err.response?.data?.message || err.message || '';
  return /tồn tại|đã tồn tại|already exists|duplicate|conflict|unique|exists/i.test(message);
};

/**
 * Detect "in-use" / business-rule delete error from backend
 * (e.g. "Không thể xóa danh mục đang được sử dụng").
 */
export const isInUseError = (err) => {
  if (!err) return false;
  const status = err.response?.status;
  if (status === 409 || status === 422 || status === 400) return true;
  const message = err.response?.data?.message || err.message || '';
  return /đang được sử dụng|in use|in-use|đang dùng|being used/i.test(message);
};

// =========================================================
// Dashboard overview
// =========================================================

export const getDashboardOverview = async () => {
  if (USE_MOCK) {
    await _delay(250);
    return computeDashboardOverview();
  }
  try {
    const res = await apiClient.get('/admin/dashboard');
    return extractObject(res.data) || {};
  } catch (err) {
    if (err.response?.status === 404) return {};
    throw err;
  }
};

// =========================================================
// Customers (UC09)
// =========================================================

export const getCustomers = async (params = {}) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(220);
    const { q = '', status = 'ALL' } = params || {};
    const term = String(q || '').toLowerCase().trim();

    return _customers
      .filter((c) => {
        if (status === 'ACTIVE' && !c.active) return false;
        if (status === 'INACTIVE' && c.active) return false;
        if (!term) return true;

        return (
          (c.name || '').toLowerCase().includes(term)
          || (c.email || '').toLowerCase().includes(term)
          || (c.phone || '').includes(term)
          || (c.username || '').toLowerCase().includes(term)
        );
      })
      .map((c) => ({ ...c }));
  }

  const res = await apiClient.get('/users/');
  const users = extractList(res.data);

  return users
    .filter((user) => user.role === 'CUSTOMER')
    .map((user) => ({
      ...user,
      name: user.fullName,
    }));
};

export const getCustomerById = async (id) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(150);
    const c = _customers.find((x) => String(x.id) === String(id));
    return c ? { ...c } : null;
  }

  const res = await apiClient.get(`/users/${id}`);
  const customer = extractObject(res.data);

  if (customer?.role !== 'CUSTOMER') {
    throw new Error('Người dùng không phải khách hàng.');
  }

  return customer;
};

export const updateCustomerStatus = async (id, status) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(250);

    const c = _customers.find((x) => String(x.id) === String(id));

    if (!c) {
      const err = new Error('Không tìm thấy khách hàng.');
      err.response = { status: 404 };
      throw err;
    }

    c.active = Boolean(status);

    return { ...c };
  }

  const active =
    status === true
    || status === 'active'
    || status === 'ACTIVE';

  const res = await apiClient.patch(
    active
      ? `/users/${id}/unlock`
      : `/users/${id}/lock`,
  );

  const user = extractObject(res.data);

  return {
    ...user,
    name: user?.fullName,
  };
};

// =========================================================
// Therapists (UC09)
// =========================================================

export const getTherapistsAdmin = async (params = {}) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(220);

    const { q = '', status = 'ALL' } = params || {};
    const term = String(q || '').toLowerCase().trim();

    return _therapists
      .filter((t) => {
        if (status === 'ACTIVE' && !t.active) return false;
        if (status === 'INACTIVE' && t.active) return false;
        if (!term) return true;

        return (
          (t.name || '').toLowerCase().includes(term)
          || (t.email || '').toLowerCase().includes(term)
          || (t.phone || '').includes(term)
          || (t.specialty || '').toLowerCase().includes(term)
        );
      })
      .map((t) => ({ ...t }));
  }

  const res = await apiClient.get('/users/');
  const users = extractList(res.data);

  return users
    .filter((user) => user.role === 'THERAPIST')
    .map((user) => ({
      ...user,
      name: user.fullName,
    }));
};

export const getTherapistById = async (id) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(180);

    const therapist = _therapists.find(
      (item) => String(item.id) === String(id)
    );

    if (!therapist) {
      throw new Error('Không tìm thấy kỹ thuật viên.');
    }

    return { ...therapist };
  }

  const res = await apiClient.get(`/users/${id}`);
  const therapist = extractObject(res.data);

  if (therapist?.role !== 'THERAPIST') {
    throw new Error('Người dùng không phải kỹ thuật viên.');
  }

  return therapist;
};

const _mock = {
  isDuplicateTherapist: (username, email, excludeId = null) =>
    _therapists.some(
      (t) =>
        String(t.id) !== String(excludeId || '')
        && (t.username === username || t.email === email)
    ),
};

export const createTherapist = async (payload) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(350);
    if (_mock.isDuplicateTherapist(payload.username, payload.email)) {
      const err = new Error('Thông tin nhân sự đã tồn tại trên hệ thống.');
      err.response = { status: 409, data: { message: err.message } };
      throw err;
    }
    const id = _nextTherapistId++;
    const record = {
      id,
      name: payload.name,
      username: payload.username,
      email: payload.email,
      phone: payload.phone || '',
      specialty: payload.specialty || '',
      bio: payload.bio || '',
      experience: payload.experience || 0,
      password: '******',
      active: true,
      role: 'THERAPIST',
      createdAt: new Date().toISOString(),
      image: payload.image || '',
    };
    _therapists.unshift(record);
    return { ...record };
  }
  const res = await apiClient.post('/users/therapists', payload);
  return extractObject(res.data);
};

export const updateTherapist = async (id, payload) => {
  if (USE_MOCK_ADMIN_USERS) {
    const index = _therapists.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Không tìm thấy kỹ thuật viên.');
    }

    _therapists[index] = {
      ..._therapists[index],
      ...payload,
    };

    return _therapists[index];
  }

  const res = await apiClient.put(`/users/therapists/${id}`, payload);
  return extractObject(res.data);
};

export const updateTherapistStatus = async (id, status) => {
  if (USE_MOCK_ADMIN_USERS) {
    await _delay(220);

    const t = _therapists.find((x) => String(x.id) === String(id));

    if (!t) {
      const err = new Error('Không tìm thấy nhân sự.');
      err.response = { status: 404 };
      throw err;
    }

    t.active = Boolean(status);

    return { ...t };
  }

  const active =
    status === true
    || status === 'active'
    || status === 'ACTIVE';

  const res = await apiClient.patch(
    active
      ? `/users/${id}/unlock`
      : `/users/${id}/lock`,
  );

  const user = extractObject(res.data);

  return {
    ...user,
    name: user?.fullName,
  };
};

// =========================================================
// Catalog - Services (P2-B1)
// =========================================================
//
// Real backend integration against treatment-service:
//   GET    /treatments/
//   POST   /treatments/        (create)
//   GET    /treatments/{id}    (single, optional)
//   PUT    /treatments/{id}    (update content)
//   DELETE /treatments/{id}    (soft-deactivate; backend hides inactive
//                                items from subsequent GET /treatments/)
//
// Backend schema (TreatmentResponse):
//   id, name, category, price, durationMinutes, description, isActive
//
// Requests only carry content fields. isActive is server-controlled.
// All *UI-side* fields (duration, active) are derived from the wire
// schema inside the service so pages don't have to.

const _services = [];
let _servicesSeedLoaded = false;

const _normalizeTreatment = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const duration = Number(raw.durationMinutes ?? raw.duration ?? 0) || 0;
  const active =
    typeof raw.isActive === 'boolean'
      ? raw.isActive
      : typeof raw.active === 'boolean'
        ? raw.active
        : true;
  return {
    ...raw,
    id: raw.id,
    name: raw.name ?? '',
    category: raw.category ?? null,
    price: raw.price ?? 0,
    duration,
    durationMinutes: duration,
    description: raw.description ?? '',
    active,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : active,
  };
};

export const getServicesAdmin = async () => {
  if (USE_MOCK_ADMIN_CATALOG_SERVICES) {
    await _delay(200);
    if (!_servicesSeedLoaded) {
      catalogServices.forEach((s) => {
        if (!_services.find((x) => String(x.id) === String(s.id))) {
          _services.push({ ...s, active: true, isActive: true });
        }
      });
      _servicesSeedLoaded = true;
    }
    return _services.map((s) => ({ ...s }));
  }
  // GET /treatments/  (collection root requires trailing slash)
  // Backend already filters out inactive items, so the returned list is
  // implicitly "active" - we still derive `active` from `isActive` for
  // backwards-compat consumers.
  const res = await apiClient.get('/treatments/');
  const list = extractList(res.data);
  return list.map(_normalizeTreatment);
};

export const createService = async (payload) => {
  if (USE_MOCK_ADMIN_CATALOG_SERVICES) {
    await _delay(280);
    const id = 1000 + _services.length + 1;
    const record = {
      ...payload,
      id,
      durationMinutes: Number(payload.durationMinutes ?? payload.duration ?? 0),
      duration: Number(payload.durationMinutes ?? payload.duration ?? 0),
      active: payload.active !== false,
      isActive: payload.active !== false,
      createdAt: new Date().toISOString(),
    };
    _services.unshift(record);
    return _normalizeTreatment(record);
  }
  // POST /treatments/
  // Backend expects: name, category, price, durationMinutes, description.
  // isActive/id are server-controlled and intentionally omitted.
  const res = await apiClient.post('/treatments/', payload);
  return _normalizeTreatment(extractObject(res.data));
};

export const updateService = async (id, payload) => {
  if (USE_MOCK_ADMIN_CATALOG_SERVICES) {
    await _delay(280);
    const idx = _services.findIndex((s) => String(s.id) === String(id));
    if (idx < 0) {
      const seed = catalogServices.find((s) => String(s.id) === String(id));
      if (!seed) {
        const err = new Error('Không tìm thấy dịch vụ.');
        err.response = { status: 404 };
        throw err;
      }
      _services.push({ ...seed, ...payload });
    } else {
      _services[idx] = {
        ..._services[idx],
        ...payload,
        durationMinutes: Number(payload.durationMinutes ?? payload.duration ?? _services[idx].durationMinutes),
        duration: Number(payload.durationMinutes ?? payload.duration ?? _services[idx].duration),
      };
    }
    return _normalizeTreatment(
      _services.find((s) => String(s.id) === String(id)),
    );
  }
  // PUT /treatments/{id} - content-only update.
  // Caller MUST NOT send isActive / active. Backend has no re-activate
  // endpoint; toggling is owned by DELETE (soft-deactivate).
  const res = await apiClient.put(`/treatments/${id}`, payload);
  return _normalizeTreatment(extractObject(res.data));
};

export const deleteService = async (id) => {
  if (USE_MOCK_ADMIN_CATALOG_SERVICES) {
    await _delay(220);
    const idx = _services.findIndex((s) => String(s.id) === String(id));
    if (idx >= 0) _services.splice(idx, 1);
    return;
  }
  // DELETE /treatments/{id} - backend soft-deactivates (isActive=false).
  // Subsequent GET /treatments/ therefore hides the item - the page
  // removes it from the UI list on success.
  await apiClient.delete(`/treatments/${id}`);
};

// =========================================================
// Catalog - Rooms (P2-B2)
// =========================================================
//
// Real backend integration against room-service:
//   GET    /rooms/        (collection root, trailing slash; active items)
//   POST   /rooms/        (create)
//   GET    /rooms/{id}    (single)
//   PUT    /rooms/{id}    (update content fields)
//   DELETE /rooms/{id}    (soft-delete; backend returns 409 when OCCUPIED)
//
// Backend schema (RoomResponse):
//   id, name, type, price, capacity, note, isActive, status
//
// Requests only carry content fields: name, type, price, capacity, note.
// `status` is runtime (AVAILABLE/OCCUPIED) and is owned by
// appointment-service - the admin form MUST NOT send or edit it.
// `isActive` is server-controlled (soft-deleted via DELETE; no re-activate
// endpoint). The catalog form therefore has no status / active toggles.

const ROOM_TYPE_VALUES = ['VIP', 'PERSONAL', 'FAMILY', 'NORMAL'];

const _rooms = [];
let _nextRoomId = 100;
let _roomsSeedLoaded = false;

const _normalizeRoom = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const isActive =
    typeof raw.isActive === 'boolean'
      ? raw.isActive
      : typeof raw.active === 'boolean'
        ? raw.active
        : true;
  return {
    ...raw,
    id: raw.id,
    name: raw.name ?? '',
    type: raw.type ?? null,
    price: raw.price ?? 0,
    capacity: raw.capacity ?? 0,
    note: raw.note ?? '',
    isActive,
    active: isActive,
    status: raw.status ?? 'AVAILABLE',
  };
};

const _mockRoomStatusFor = (seed) => {
  // Mock fixtures never come from the real room-service, so derive a
  // deterministic runtime status from the seed id so the table can render
  // the read-only badge. Anything > 100 is treated as OCCUPIED for demo.
  if (seed && seed.status) return seed.status;
  const idNum = Number(seed?.id);
  if (Number.isFinite(idNum) && idNum % 2 === 0) return 'OCCUPIED';
  return 'AVAILABLE';
};

export const getRoomsAdmin = async () => {
  if (USE_MOCK_ADMIN_CATALOG_ROOMS) {
    await _delay(200);
    if (!_roomsSeedLoaded) {
      catalogRooms.forEach((r) => {
        if (!_rooms.find((x) => String(x.id) === String(r.id))) {
          const typeVal = ROOM_TYPE_VALUES.includes(r.type)
            ? r.type
            : (r.name === 'Phòng VIP' ? 'VIP'
              : r.name === 'Phòng cá nhân' ? 'PERSONAL'
              : r.name === 'Phòng gia đình' ? 'FAMILY'
              : 'NORMAL');
          _rooms.push({
            id: r.id,
            name: r.name,
            type: typeVal,
            price: 0,
            capacity: r.capacity || 1,
            note: r.description || r.note || '',
            isActive: true,
            active: true,
            status: _mockRoomStatusFor(r),
          });
        }
      });
      _roomsSeedLoaded = true;
    }
    return _rooms.map((r) => ({ ...r }));
  }
  // GET /rooms/  (collection root requires trailing slash)
  // Backend already filters out inactive items (isActive=false), so the
  // returned list is implicitly "active" - we still derive `active` from
  // `isActive` for backwards-compat consumers.
  const res = await apiClient.get('/rooms/');
  const list = extractList(res.data);
  return list.map(_normalizeRoom);
};

export const createRoom = async (payload) => {
  if (USE_MOCK_ADMIN_CATALOG_ROOMS) {
    await _delay(280);
    const id = _nextRoomId++;
    const typeVal = ROOM_TYPE_VALUES.includes(payload.type) ? payload.type : 'NORMAL';
    const record = {
      id,
      name: payload.name,
      type: typeVal,
      price: Number(payload.price ?? 0),
      capacity: Number(payload.capacity ?? 1),
      note: payload.note ?? '',
      isActive: true,
      active: true,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
    };
    _rooms.unshift(record);
    return { ...record };
  }
  // POST /rooms/
  // Backend expects: name, type, price, capacity, note.
  // isActive / id / status are server-controlled and intentionally omitted.
  const res = await apiClient.post('/rooms/', payload);
  return _normalizeRoom(extractObject(res.data));
};

export const updateRoom = async (id, payload) => {
  if (USE_MOCK_ADMIN_CATALOG_ROOMS) {
    await _delay(280);
    const idx = _rooms.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) {
      const err = new Error('Không tìm thấy phòng.');
      err.response = { status: 404 };
      throw err;
    }
    const typeVal = ROOM_TYPE_VALUES.includes(payload.type)
      ? payload.type
      : _rooms[idx].type;
    _rooms[idx] = {
      ..._rooms[idx],
      ...payload,
      type: typeVal,
      price: Number(payload.price ?? _rooms[idx].price ?? 0),
      capacity: Number(payload.capacity ?? _rooms[idx].capacity ?? 1),
    };
    return { ..._rooms[idx] };
  }
  // PUT /rooms/{id} - content-only update.
  // Caller MUST NOT send isActive / active / status. Backend has no
  // re-activate endpoint; soft-delete is owned by DELETE.
  const res = await apiClient.put(`/rooms/${id}`, payload);
  return _normalizeRoom(extractObject(res.data));
};

export const deleteRoom = async (id) => {
  if (USE_MOCK_ADMIN_CATALOG_ROOMS) {
    await _delay(220);
    const idx = _rooms.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) {
      if (_rooms[idx].status === 'OCCUPIED') {
        const err = new Error('Không thể xóa phòng đang được sử dụng.');
        err.response = { status: 409, data: { message: err.message } };
        throw err;
      }
      _rooms.splice(idx, 1);
    }
    return;
  }
  // DELETE /rooms/{id} - backend soft-deletes (isActive=false).
  // Returns 409 when the room is currently OCCUPIED. The page surfaces the
  // backend's message verbatim and keeps the room in the table.
  await apiClient.delete(`/rooms/${id}`);
};

// =========================================================
// Catalog - Cosmetics (UC10)
// =========================================================

let _nextCosmeticId = 1000;

export const getCosmeticsAdmin = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(200);
    const { q = '' } = params || {};
    const term = String(q || '').toLowerCase().trim();
    return _inventory
      .filter((c) =>
        !term
        || (c.name || '').toLowerCase().includes(term)
        || (c.brand || '').toLowerCase().includes(term)
      )
      .map((c) => ({ ...c, lots: undefined }));
  }
  return safeList(apiClient.get('/admin/cosmetics', { params }));
};

export const createCosmetic = async (payload) => {
  if (USE_MOCK) {
    await _delay(280);
    const id = _nextCosmeticId++;
    const record = {
      ...payload,
      id,
      lots: [],
      createdAt: new Date().toISOString(),
    };
    _inventory.unshift(record);
    return { ...record, lots: undefined };
  }
  const res = await apiClient.post('/admin/cosmetics', payload);
  return extractObject(res.data);
};

export const updateCosmetic = async (id, payload) => {
  if (USE_MOCK) {
    await _delay(280);
    const idx = _inventory.findIndex((c) => String(c.id) === String(id));
    if (idx < 0) {
      const err = new Error('Không tìm thấy mỹ phẩm.');
      err.response = { status: 404 };
      throw err;
    }
    _inventory[idx] = { ..._inventory[idx], ...payload };
    return { ..._inventory[idx], lots: undefined };
  }
  const res = await apiClient.put(`/admin/cosmetics/${id}`, payload);
  return extractObject(res.data);
};

export const deleteCosmetic = async (id) => {
  if (USE_MOCK) {
    await _delay(220);
    const idx = _inventory.findIndex((c) => String(c.id) === String(id));
    if (idx >= 0) _inventory.splice(idx, 1);
    return;
  }
  await apiClient.delete(`/admin/cosmetics/${id}`);
};

// =========================================================
// Appointments (UC11 - admin view)
// =========================================================

/**
 * List appointments for the admin to pick a completed one when creating an
 * invoice (Flow 1). Backend may scope to completed only via ?status=COMPLETED.
 */
export const getAdminAppointments = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(200);
    const { status, q } = params || {};
    return _appointmentsSeed
      .filter((a) => (!status || a.status === status)
        && (!q
          || (a.code || '').toLowerCase().includes(String(q).toLowerCase())
          || (a.customerName || '').toLowerCase().includes(String(q).toLowerCase()))
      )
      .map((a) => ({ ...a }));
  }
  return safeList(apiClient.get('/admin/appointments', { params }));
};

export const getAdminAppointmentById = async (id) => {
  if (USE_MOCK) {
    await _delay(120);
    const a = _appointmentsSeed.find((x) => String(x.id) === String(id));
    return a ? { ...a } : null;
  }
  if (!id) return null;
  try {
    const res = await apiClient.get(`/admin/appointments/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

// =========================================================
// Inventory (UC10 + UC11)
// =========================================================

/**
 * Fetch the current inventory snapshot.
 * Returns a list of cosmetic-stock objects. The backend typically enriches
 * each row with totals, lot/batch list and SKU info - we accept either a
 * bare list or an envelope { data | items | results } when the network is up.
 */
export const getInventory = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(220);
    const { q = '', status = 'ALL' } = params || {};
    const term = String(q || '').toLowerCase().trim();
    return _inventory
      .filter((row) => {
        if (status === 'LOW' && (row.stock || 0) >= (row.minStock || 20)) return false;
        if (status === 'OUT' && (row.stock || 0) > 0) return false;
        if (!term) return true;
        return (
          (row.name || '').toLowerCase().includes(term)
          || (row.brand || '').toLowerCase().includes(term)
        );
      })
      .map((row) => ({
        ...row,
        lots: (row.lots || []).map((l) => ({ ...l })),
      }));
  }
  return safeList(apiClient.get('/admin/inventory', { params }));
};

/**
 * Fetch the lot/batch breakdown for a single inventory row.
 */
export const getInventoryLots = async (inventoryId) => {
  if (USE_MOCK) {
    await _delay(150);
    const row = _inventory.find((x) => String(x.id) === String(inventoryId));
    return row ? (row.lots || []).map((l) => ({ ...l })) : [];
  }
  if (!inventoryId) return [];
  return safeList(apiClient.get(`/admin/inventory/${inventoryId}/lots`));
};

/**
 * Update one lot/batch (e.g. adjust quantity, expiry).
 */
export const updateInventoryLot = async (inventoryId, lotId, payload) => {
  if (USE_MOCK) {
    await _delay(220);
    const row = _inventory.find((x) => String(x.id) === String(inventoryId));
    if (!row) {
      const err = new Error('Không tìm thấy mặt hàng tồn kho.');
      err.response = { status: 404 };
      throw err;
    }
    const lot = (row.lots || []).find((l) => String(l.id) === String(lotId));
    if (!lot) {
      const err = new Error('Không tìm thấy lô.');
      err.response = { status: 404 };
      throw err;
    }
    Object.assign(lot, payload);
    // Recompute the cosmetic's overall stock from the lots.
    row.stock = (row.lots || []).reduce((s, l) => s + Number(l.quantity || 0), 0);
    return { ...lot };
  }
  const res = await apiClient.put(
    `/admin/inventory/${inventoryId}/lots/${lotId}`,
    payload,
  );
  return extractObject(res.data);
};

/**
 * Stock-in: record an incoming batch.
 */
export const stockInInventory = async (inventoryId, payload) => {
  if (USE_MOCK) {
    await _delay(280);
    const row = _inventory.find((x) => String(x.id) === String(inventoryId));
    if (!row) {
      const err = new Error('Không tìm thấy mặt hàng tồn kho.');
      err.response = { status: 404 };
      throw err;
    }
    const lotId = Date.now();
    const newLot = {
      id: lotId,
      batchNo: payload.batchNo || `LOT-${lotId}`,
      quantity: Number(payload.quantity || 0),
      expiryDate: payload.expiryDate,
      receivedAt: new Date().toISOString().slice(0, 10),
    };
    row.lots = [...(row.lots || []), newLot];
    row.stock = (row.lots || []).reduce((s, l) => s + Number(l.quantity || 0), 0);
    return { ...newLot };
  }
  const res = await apiClient.post(
    `/admin/inventory/${inventoryId}/stock-in`,
    payload,
  );
  return extractObject(res.data);
};

// =========================================================
// Invoices & Payments
// =========================================================

export const getInvoices = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(220);
    const { q = '', status = 'ALL' } = params || {};
    const term = String(q || '').toLowerCase().trim();
    return _invoices
      .filter((inv) => {
        if (status !== 'ALL' && inv.status !== status) return false;
        if (!term) return true;
        return (
          (inv.code || inv.invoiceCode || '').toLowerCase().includes(term)
          || (inv.customerName || '').toLowerCase().includes(term)
        );
      })
      .map((inv) => ({ ...inv, items: (inv.items || []).map((it) => ({ ...it })) }));
  }
  return safeList(apiClient.get('/admin/invoices', { params }));
};

export const getInvoiceById = async (id) => {
  if (USE_MOCK) {
    await _delay(150);
    const inv = _invoices.find((x) => String(x.id) === String(id));
    return inv
      ? { ...inv, items: (inv.items || []).map((it) => ({ ...it })) }
      : null;
  }
  if (!id) return null;
  try {
    const res = await apiClient.get(`/admin/invoices/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Create a new invoice from an appointment (Flow 1).
 */
export const createInvoiceFromAppointment = async (appointmentId, payload = {}) => {
  if (USE_MOCK) {
    await _delay(280);
    const apt = _appointmentsSeed.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      const err = new Error('Không tìm thấy lịch hẹn.');
      err.response = { status: 404 };
      throw err;
    }
    const items = (payload.cosmeticItems || []).map((it, idx) => ({
      id: 9000 + idx,
      name: it.name || 'Mỹ phẩm',
      type: 'COSMETIC',
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      total: Number(it.quantity || 1) * Number(it.unitPrice || 0),
    }));
    if (apt.price) {
      items.unshift({
        id: 9001,
        name: apt.serviceName || apt.service?.name || 'Dịch vụ',
        type: 'SERVICE',
        quantity: 1,
        unitPrice: apt.price,
        total: apt.price,
      });
    }
    const totalAmount = items.reduce((s, it) => s + (it.total || 0), 0);
    const id = _nextInvoiceId++;
    const code = `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
    const record = {
      id,
      code,
      invoiceCode: code,
      customerId: apt.customerId,
      customerName: apt.customerName,
      customer: apt.customer,
      appointmentId,
      items,
      subtotal: totalAmount,
      totalAmount,
      amount: totalAmount,
      status: 'PENDING',
      paidAt: null,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: null,
    };
    _invoices.unshift(record);
    return { ...record };
  }
  const res = await apiClient.post(
    `/admin/invoices/from-appointment/${appointmentId}`,
    payload,
  );
  return extractObject(res.data);
};

/**
 * Create a retail invoice (Flow 2) selling one or more cosmetics.
 */
export const createRetailInvoice = async (payload) => {
  if (USE_MOCK) {
    await _delay(280);
    const customerId = payload.customerId || 1;
    const customer = _customers.find((c) => c.id === customerId) || _customers[0];
    const items = (payload.items || []).map((it, idx) => ({
      id: 9000 + idx,
      name: it.name || 'Mỹ phẩm',
      type: 'COSMETIC',
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      total: Number(it.quantity || 1) * Number(it.unitPrice || 0),
    }));
    const totalAmount = items.reduce((s, it) => s + (it.total || 0), 0);
    const id = _nextInvoiceId++;
    const code = `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
    const record = {
      id,
      code,
      invoiceCode: code,
      customerId,
      customerName: customer.name,
      customer,
      items,
      subtotal: totalAmount,
      totalAmount,
      amount: totalAmount,
      status: payload.markAsPaid ? 'PAID' : 'PENDING',
      paidAt: payload.markAsPaid ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: payload.markAsPaid ? payload.method || 'CASH' : null,
    };
    _invoices.unshift(record);
    return { ...record };
  }
  const res = await apiClient.post('/admin/invoices', payload);
  return extractObject(res.data);
};

/**
 * Confirm payment on an invoice.
 * method accepts CASH, BANK_TRANSFER or CARD (case-insensitive on the wire).
 */
export const payInvoice = async (id, method, payload = {}) => {
  if (USE_MOCK) {
    await _delay(250);
    const inv = _invoices.find((x) => String(x.id) === String(id));
    if (!inv) {
      const err = new Error('Không tìm thấy hóa đơn.');
      err.response = { status: 404 };
      throw err;
    }
    inv.status = 'PAID';
    inv.paymentMethod = method;
    inv.paidAt = new Date().toISOString();
    return { ...inv };
  }
  const res = await apiClient.post(`/admin/invoices/${id}/pay`, {
    method,
    ...payload,
  });
  return extractObject(res.data);
};

// =========================================================
// Reports & Statistics (UC12)
// =========================================================

export const getReportsOverview = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(300);
    return computeReport(params.from, params.to);
  }
  try {
    const res = await apiClient.get('/admin/reports', { params });
    return extractObject(res.data) || {};
  } catch (err) {
    if (err.response?.status === 404) return {};
    throw err;
  }
};

export const getPaidInvoicesForReport = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(180);
    return _invoices
      .filter((inv) => inv.status === 'PAID')
      .map((inv) => ({ ...inv, items: (inv.items || []).map((it) => ({ ...it })) }));
  }
  const list = await safeList(
    apiClient.get('/admin/invoices', { params: { status: 'PAID', ...params } }),
  );
  return Array.isArray(list) ? list : [];
};

export const getCustomersForReport = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(120);
    return _customers.map((c) => ({ ...c }));
  }
  return safeList(apiClient.get('/admin/customers', { params }));
};

export const getAppointmentsForReport = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(150);
    return _appointmentsSeed.map((a) => ({ ...a }));
  }
  return safeList(apiClient.get('/admin/appointments', { params }));
};

// =========================================================
// Helpers exposed for components
// =========================================================

export const helpers = {
  extractList,
  extractObject,
  extractApiError,
  isDuplicateError,
  isInUseError,
};

export default {
  // Dashboard
  getDashboardOverview,
  // Customers
  getCustomers,
  getCustomerById,
  updateCustomerStatus,
  // Therapists
  getTherapistsAdmin,
  getTherapistById,
  createTherapist,
  updateTherapist,
  updateTherapistStatus,
  // Services
  getServicesAdmin,
  createService,
  updateService,
  deleteService,
  // Rooms
  getRoomsAdmin,
  createRoom,
  updateRoom,
  deleteRoom,
  // Cosmetics
  getCosmeticsAdmin,
  createCosmetic,
  updateCosmetic,
  deleteCosmetic,
  // Appointments
  getAdminAppointments,
  getAdminAppointmentById,
  // Inventory
  getInventory,
  getInventoryLots,
  updateInventoryLot,
  stockInInventory,
  // Invoices / payments
  getInvoices,
  getInvoiceById,
  createInvoiceFromAppointment,
  createRetailInvoice,
  payInvoice,
  // Reports
  getReportsOverview,
  getPaidInvoicesForReport,
  getCustomersForReport,
  getAppointmentsForReport,
  // Helpers
  extractApiError,
  isDuplicateError,
  isInUseError,
};
