// Admin API Service
// Centralises all admin-scope API calls (UC09, UC10, UC11, UC12):
//   - /admin/dashboard (overview)
//   - /admin/customers (UC09)
//   - /admin/therapists (UC09 - incl. create/update)
//   - /rooms/, /cosmetics/, /admin/rooms (UC10)
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
// Dedicated flag so Admin → Hóa đơn & thanh toán can hit the real
// payment-service backend without flipping the global mock flag.
const USE_MOCK_ADMIN_INVOICES =
  import.meta.env.VITE_USE_MOCK_ADMIN_INVOICES === 'true';
// Dedicated flag so the cosmetic picker inside Admin → Hóa đơn & thanh
// toán → Bán lẻ mỹ phẩm hits the real cosmetic-service /cosmetics/
// backend. Without this, retail-invoice creation is fed from the global
// mock inventory which uses numeric ids (e.g. 1, 2) and the resulting
// POST /payments/ gets rejected with COSMETIC_NOT_EXISTED.
const USE_MOCK_ADMIN_CATALOG_COSMETICS =
  import.meta.env.VITE_USE_MOCK_ADMIN_CATALOG_COSMETICS === 'true';
// Dedicated flag so the appointment picker inside Admin → Hóa đơn & thanh
// toán → Từ lịch hẹn hits the real appointment-service /appointments/
// backend (ADMIN-protected, optional ?status= filter). Without this, the
// picker is fed from the global mock seed (numeric ids like 505) and
// POST /payments/ gets rejected with APPOINTMENT_NOT_EXISTED.
const USE_MOCK_ADMIN_APPOINTMENTS =
  import.meta.env.VITE_USE_MOCK_ADMIN_APPOINTMENTS === 'true';
// Dedicated flag so Admin → Báo cáo & Thống kê can hit the real backend
// reporting endpoints (UC_12) without flipping the global mock flag,
// which still keeps unrelated admin views on mocks.
//   GET /payments/admin/revenue?from&to
//   GET /cosmetics/admin/inventory-report
//   GET /users/admin/stats?from&to
//   GET /appointments/admin/stats?from&to
// The flag is INDEPENDENT from USE_MOCK so a future rollback or A/B test
// on reporting can flip one without touching anything else.
const USE_MOCK_ADMIN_REPORTS =
  import.meta.env.VITE_USE_MOCK_ADMIN_REPORTS === 'true';

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

/**
 * Detect "stale state" errors from the backend where the resource has
 * already been mutated by another session/request (e.g. invoice moved from
 * PENDING_PAYMENT to PAID before the current confirm-payment could land).
 * The page should refresh and surface the backend message instead of the
 * generic fallback error.
 *
 * Identified by:
 *  - HTTP 400/409/422, and
 *  - either an explicit business code (1053 = "Hóa đơn không ở trạng thái
 *    Chờ thanh toán"), or
 *  - a Vietnamese phrasing that mentions status/trạng thái.
 */
export const isStaleStateError = (err) => {
  if (!err) return false;
  const status = err.response?.status;
  if (status !== 400 && status !== 409 && status !== 422) return false;
  const code = err.response?.data?.code;
  if (code === 1053) return true;
  const message = err.response?.data?.message || err.message || '';
  return /trạng thái|status|đã (được )?(thanh toán|hủy|paid|cancelled|chuyển)|not in (the )?(right |correct )?status|invalid state/i.test(message);
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
  if (USE_MOCK_ADMIN_CATALOG_COSMETICS) {
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
  // GET /cosmetics/  (collection root requires trailing slash; gateway
  // stripPrefix=2 strips /api/omamori before forwarding to cosmetic-service).
  // Backend ids are UUID strings; forwarded verbatim to /payments/.
  return safeList(apiClient.get('/cosmetics/', { params }));
};

export const createCosmetic = async (payload) => {
  if (USE_MOCK_ADMIN_CATALOG_COSMETICS) {
    await _delay(280);
    const id = _nextCosmeticId++;
    const record = {
      ...payload,
      id,
      stockQuantity: Number(payload.initialQuantity ?? 0),
      stock: Number(payload.initialQuantity ?? 0),
      lots: [],
      createdAt: new Date().toISOString(),
    };
    _inventory.unshift(record);
    return { ...record, lots: undefined };
  }
  // POST /cosmetics/  (collection root requires trailing slash; gateway
  // stripPrefix=2 strips /api/omamori before forwarding to cosmetic-service,
  // whose @RequestMapping("/") then matches /cosmetics/ -> /).
  // Backend expects: name, brand, manufacturer, unit, price, description,
  // initialQuantity. initialQuantity is CREATE-only.
  const res = await apiClient.post('/cosmetics/', payload);
  return extractObject(res.data);
};

export const updateCosmetic = async (id, payload) => {
  if (USE_MOCK_ADMIN_CATALOG_COSMETICS) {
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
  // PUT /cosmetics/{id} - content-only update. CosmeticUpdateRequest does
  // NOT include initialQuantity (stock is owned by the dedicated stock-in
  // flow). Caller must strip it before invoking this.
  const res = await apiClient.put(`/cosmetics/${id}`, payload);
  return extractObject(res.data);
};

export const deleteCosmetic = async (id) => {
  if (USE_MOCK_ADMIN_CATALOG_COSMETICS) {
    await _delay(220);
    const idx = _inventory.findIndex((c) => String(c.id) === String(id));
    if (idx >= 0) _inventory.splice(idx, 1);
    return;
  }
  // DELETE /cosmetics/{id} - backend soft-deletes (isActive=false).
  await apiClient.delete(`/cosmetics/${id}`);
};

// =========================================================
// Appointments (UC11 - admin view)
// =========================================================

/**
 * List appointments for the admin to pick a completed one when creating an
 * invoice (Flow 1). Backend (ADMIN) exposes:
 *   GET /appointments/?status=COMPLETED
 * Backend only honours `status`; any other query (e.g. free-text `q`) is
 * applied client-side so the picker UX still has search.
 */
export const getAdminAppointments = async (params = {}) => {
  if (USE_MOCK_ADMIN_APPOINTMENTS) {
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
  const { status, q } = params || {};
  const wireParams = {};
  if (status) wireParams.status = status;
  const list = await safeList(apiClient.get('/appointments/', { params: wireParams }));
  if (!q) return list;
  const term = String(q).toLowerCase();
  return list.filter((a) =>
    (a.code || '').toLowerCase().includes(term)
    || (a.customerName || '').toLowerCase().includes(term)
  );
};

export const getAdminAppointmentById = async (id) => {
  if (USE_MOCK_ADMIN_APPOINTMENTS) {
    await _delay(120);
    const a = _appointmentsSeed.find((x) => String(x.id) === String(id));
    return a ? { ...a } : null;
  }
  if (!id) return null;
  try {
    const res = await apiClient.get(`/appointments/${id}`);
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
//
// Real backend integration against payment-service (gateway:
//   GET    /payments/                          list invoices
//   POST   /payments/                          create (appointment or retail)
//   GET    /payments/{id}                      single invoice
//   PATCH  /payments/{id}/confirm-payment      mark paid ({ paymentMethod })
//   PATCH  /payments/{id}/cancel               cancel pending invoice
//
// InvoiceResponse wire schema (kept here for reference):
//   {
//     id, customerId, appointmentId, status, paymentMethod,
//     totalAmount, items: [{ id, itemType, referenceId, itemName,
//                            unitPrice, quantity, subtotal }],
//     createdAt, paidAt
//   }
// PaymentMethod: CASH | BANK_TRANSFER  (no CARD; VNPay maps to BANK_TRANSFER)
// InvoiceStatus: PENDING_PAYMENT | PAID | CANCELLED
//
// When creating from an appointment, callers send { appointmentId } and the
// backend derives service/room/cosmetic line items from the appointment +
// its CosmeticOrder. When creating a retail invoice, callers send
// { customerId, cosmeticItems: [{ cosmeticId, quantity }] } - the backend
// looks up names/prices and snapshots them into InvoiceItem records.

export const getInvoices = async (params = {}) => {
  if (USE_MOCK_ADMIN_INVOICES) {
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
      .map((inv) => ({
        ...inv,
        items: (inv.items || []).map((it) => ({ ...it })),
      }));
  }
  // GET /payments/  (collection root requires trailing slash; some gateways
  // strip it but axios will keep what we send).
  // Backend does not honour query params (notably ?status=), so always fetch
  // the full list and apply status / free-text filters on the client.
  const { status, q } = params || {};
  const list = await safeList(apiClient.get('/payments/'));
  const term = String(q || '').toLowerCase().trim();
  return list.filter((inv) => {
    if (status && status !== 'ALL' && inv.status !== status) return false;
    if (!term) return true;
    return (
      (inv.code || inv.invoiceCode || '').toLowerCase().includes(term)
      || (inv.customerName || '').toLowerCase().includes(term)
    );
  });
};

export const getInvoiceById = async (id) => {
  if (USE_MOCK_ADMIN_INVOICES) {
    await _delay(150);
    const inv = _invoices.find((x) => String(x.id) === String(id));
    return inv
      ? { ...inv, items: (inv.items || []).map((it) => ({ ...it })) }
      : null;
  }
  if (!id) return null;
  try {
    const res = await apiClient.get(`/payments/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Create a new invoice from a completed appointment (Flow 1).
 * Backend derives line items itself; FE only sends appointmentId.
 */
export const createInvoiceFromAppointment = async (appointmentId) => {
  if (USE_MOCK_ADMIN_INVOICES) {
    await _delay(280);
    const apt = _appointmentsSeed.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      const err = new Error('Không tìm thấy lịch hẹn.');
      err.response = { status: 404 };
      throw err;
    }
    const items = [];
    if (apt.price) {
      items.push({
        id: 9001,
        itemType: 'SERVICE',
        itemName: apt.serviceName || apt.service?.name || 'Dịch vụ',
        quantity: 1,
        unitPrice: apt.price,
        subtotal: apt.price,
      });
    }
    const totalAmount = items.reduce((s, it) => s + (it.subtotal || 0), 0);
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
      status: 'PENDING_PAYMENT',
      paidAt: null,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: null,
      type: 'APPOINTMENT',
    };
    _invoices.unshift(record);
    return { ...record };
  }
  // POST /payments/ with { appointmentId }
  const res = await apiClient.post('/payments/', { appointmentId });
  return extractObject(res.data);
};

/**
 * Create a retail invoice (Flow 2) selling one or more cosmetics.
 * Backend looks up names/prices; FE only sends ids and quantities.
 */
export const createRetailInvoice = async (payload) => {
  if (USE_MOCK_ADMIN_INVOICES) {
    await _delay(280);
    const customerId = payload.customerId || 1;
    const customer = _customers.find((c) => c.id === customerId) || _customers[0];
    const items = (payload.cosmeticItems || payload.items || []).map((it, idx) => {
      const catalog = _inventory.find((c) => String(c.id) === String(it.cosmeticId));
      const unitPrice = Number(
        it.unitPrice ?? catalog?.price ?? catalog?.unitPrice ?? 0,
      );
      const quantity = Number(it.quantity || 1);
      return {
        id: 9000 + idx,
        itemType: 'COSMETIC',
        itemName: catalog?.name || it.name || 'Mỹ phẩm',
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      };
    });
    const totalAmount = items.reduce((s, it) => s + (it.subtotal || 0), 0);
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
      status: 'PENDING_PAYMENT',
      paidAt: null,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: null,
      type: 'RETAIL',
    };
    _invoices.unshift(record);
    return { ...record };
  }
  // POST /payments/ with { customerId, cosmeticItems: [{ cosmeticId, quantity }] }
  const body = {
    customerId: payload.customerId,
    cosmeticItems: (payload.cosmeticItems || []).map((it) => ({
      cosmeticId: it.cosmeticId,
      quantity: Number(it.quantity || 1),
    })),
  };
  const res = await apiClient.post('/payments/', body);
  return extractObject(res.data);
};

/**
 * Confirm payment on an invoice.
 * method is CASH or BANK_TRANSFER. Card is intentionally NOT supported in
 * Admin UI; VNPay flow is a payment-gateway concern that the backend records
 * as BANK_TRANSFER on IPN.
 */
export const payInvoice = async (id, method) => {
  const safeMethod = String(method || '').toUpperCase();
  if (safeMethod !== 'CASH' && safeMethod !== 'BANK_TRANSFER') {
    const err = new Error('Phương thức thanh toán không hợp lệ.');
    err.response = { status: 400, data: { message: err.message } };
    throw err;
  }

  if (USE_MOCK_ADMIN_INVOICES) {
    await _delay(250);
    const inv = _invoices.find((x) => String(x.id) === String(id));
    if (!inv) {
      const err = new Error('Không tìm thấy hóa đơn.');
      err.response = { status: 404 };
      throw err;
    }
    inv.status = 'PAID';
    inv.paymentMethod = safeMethod;
    inv.paidAt = new Date().toISOString();
    return { ...inv };
  }
  // PATCH /payments/{id}/confirm-payment with { paymentMethod }
  const res = await apiClient.patch(`/payments/${id}/confirm-payment`, {
    paymentMethod: safeMethod,
  });
  return extractObject(res.data);
};

/**
 * Cancel a pending invoice. Backend only allows PENDING_PAYMENT -> CANCELLED.
 */
export const cancelInvoice = async (id) => {
  if (USE_MOCK_ADMIN_INVOICES) {
    await _delay(220);
    const inv = _invoices.find((x) => String(x.id) === String(id));
    if (!inv) {
      const err = new Error('Không tìm thấy hóa đơn.');
      err.response = { status: 404 };
      throw err;
    }
    if (inv.status !== 'PENDING_PAYMENT') {
      const err = new Error('Chỉ hóa đơn chờ thanh toán mới có thể hủy.');
      err.response = { status: 409, data: { message: err.message } };
      throw err;
    }
    inv.status = 'CANCELLED';
    inv.paidAt = null;
    return { ...inv };
  }
  const res = await apiClient.patch(`/payments/${id}/cancel`);
  return extractObject(res.data);
};

// =========================================================
// Reports & Statistics (UC12)
// =========================================================
//
// Real backend integration (VITE_USE_MOCK_ADMIN_REPORTS=false):
//   GET /payments/admin/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
//     -> { total, serviceAmount, cosmeticAmount,
//          byDay: [{date,value}], byMonth: [{month,value}],
//          topCosmetics: [{cosmeticId,name,quantity,revenue}] }
//   GET /cosmetics/admin/inventory-report
//     -> { totalStock, lowStockThreshold, lowStockCount,
//          outOfStockCount, lowStockItems, outOfStockItems }
//   GET /users/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
//     -> { totalCustomers, newCustomers }
//   GET /appointments/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
//     -> { totalAppointments, completedAppointments }
//
// The Reports page MUST NOT fetch raw invoice/customer/appointment lists
// and recompute statistics - the backend aggregate is the source of truth.
//
// All four endpoints accept a `from` / `to` (YYYY-MM-DD) date range EXCEPT
// the inventory snapshot, which is current state and MUST NOT receive
// from/to parameters.

/**
 * Revenue aggregate for the active period.
 * Backend returns PAID-only revenue with service/cosmetic composition and
 * a daily/monthly trend series plus a top-cosmetics breakdown.
 */
export const getAdminRevenueReport = async ({ from, to } = {}) => {
  if (USE_MOCK_ADMIN_REPORTS) {
    await _delay(250);
    return computeReport(from, to);
  }
  const res = await apiClient.get('/payments/admin/revenue', {
    params: { from, to },
  });
  return extractObject(res.data) || {};
};

/**
 * Current cosmetic inventory snapshot.
 * The endpoint is intentionally date-less: stock is a present-tense value,
 * not a historical one. Do NOT pass from/to here.
 */
export const getAdminInventoryReport = async () => {
  if (USE_MOCK_ADMIN_REPORTS) {
    await _delay(220);
    const lowStockItems = [];
    const outOfStockItems = [];
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockThreshold = 20;
    _inventorySeed.forEach((row) => {
      const stock = Number(row.stock || 0);
      totalStock += stock;
      if (stock === 0) {
        outOfStockCount += 1;
        outOfStockItems.push({
          id: row.id,
          name: row.name,
          stockQuantity: stock,
        });
      } else if (stock <= lowStockThreshold) {
        lowStockCount += 1;
        lowStockItems.push({
          id: row.id,
          name: row.name,
          stockQuantity: stock,
        });
      }
    });
    return {
      totalStock,
      lowStockThreshold,
      lowStockCount,
      outOfStockCount,
      lowStockItems,
      outOfStockItems,
    };
  }
  const res = await apiClient.get('/cosmetics/admin/inventory-report');
  return extractObject(res.data) || {};
};

/**
 * Customer aggregate for the active period.
 * `totalCustomers` is the all-time count; `newCustomers` is the count of
 * customers registered within [from, to].
 */
export const getAdminCustomerStats = async ({ from, to } = {}) => {
  if (USE_MOCK_ADMIN_REPORTS) {
    await _delay(180);
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    const newCustomers = _customersSeed.filter((c) => {
      const t = new Date(c.createdAt || c.registeredAt || 0).getTime();
      if (Number.isNaN(t)) return false;
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    }).length;
    return {
      totalCustomers: _customersSeed.length,
      newCustomers,
    };
  }
  const res = await apiClient.get('/users/admin/stats', {
    params: { from, to },
  });
  return extractObject(res.data) || {};
};

/**
 * Appointment aggregate for the active period.
 * `totalAppointments` counts every appointment in [from, to];
 * `completedAppointments` is the subset whose status is COMPLETED.
 */
export const getAdminAppointmentStats = async ({ from, to } = {}) => {
  if (USE_MOCK_ADMIN_REPORTS) {
    await _delay(200);
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    const inRange = _appointmentsSeed.filter((a) => {
      const t = new Date(a.createdAt || a.date || a.startTime || 0).getTime();
      if (Number.isNaN(t)) return false;
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
    return {
      totalAppointments: inRange.length,
      completedAppointments: inRange.filter((a) => a.status === 'COMPLETED').length,
    };
  }
  const res = await apiClient.get('/appointments/admin/stats', {
    params: { from, to },
  });
  return extractObject(res.data) || {};
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
  cancelInvoice,
  // Reports (UC12)
  getAdminRevenueReport,
  getAdminInventoryReport,
  getAdminCustomerStats,
  getAdminAppointmentStats,
  // Helpers
  extractApiError,
  isDuplicateError,
  isInUseError,
  isStaleStateError,
};
