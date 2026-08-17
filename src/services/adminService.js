// Admin API Service
// Centralises all admin-scope API calls (UC09, UC10):
//   - /admin/customers (UC09)
//   - /admin/therapists (UC09 - incl. create/update)
//   - /admin/services, /admin/rooms, /admin/cosmetics (UC10)
//   - /admin/dashboard (overview)
//
// Endpoints may not exist on every backend yet; services fall back to []
// on 404 to keep the admin screens responsive while data sources stabilise.
// All create/update/delete operations surface backend business errors
// (e.g. duplicate therapist, in-use catalog) as-is for the page layer.

import apiClient from './api';

// ---- shared helpers (mirrors customerService / therapistService) ------
const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const extractObject = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.data && typeof payload.data === 'object') return payload.data;
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
  return safeList(apiClient.get('/admin/customers', { params }));
};

export const getCustomerById = async (id) => {
  try {
    const res = await apiClient.get(`/admin/customers/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const updateCustomerStatus = async (id, status) => {
  const res = await apiClient.patch(`/admin/customers/${id}/status`, { status });
  return extractObject(res.data);
};

// =========================================================
// Therapists (UC09)
// =========================================================

export const getTherapistsAdmin = async (params = {}) => {
  return safeList(apiClient.get('/admin/therapists', { params }));
};

export const getTherapistById = async (id) => {
  try {
    const res = await apiClient.get(`/admin/therapists/${id}`);
    return extractObject(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

export const createTherapist = async (payload) => {
  const res = await apiClient.post('/admin/therapists', payload);
  return extractObject(res.data);
};

export const updateTherapist = async (id, payload) => {
  const res = await apiClient.put(`/admin/therapists/${id}`, payload);
  return extractObject(res.data);
};

export const updateTherapistStatus = async (id, status) => {
  const res = await apiClient.patch(`/admin/therapists/${id}/status`, { status });
  return extractObject(res.data);
};

// =========================================================
// Catalog - Services (UC10)
// =========================================================

export const getServicesAdmin = async (params = {}) => {
  return safeList(apiClient.get('/admin/services', { params }));
};

export const createService = async (payload) => {
  const res = await apiClient.post('/admin/services', payload);
  return extractObject(res.data);
};

export const updateService = async (id, payload) => {
  const res = await apiClient.put(`/admin/services/${id}`, payload);
  return extractObject(res.data);
};

export const deleteService = async (id) => {
  await apiClient.delete(`/admin/services/${id}`);
};

// =========================================================
// Catalog - Rooms (UC10)
// =========================================================

export const getRoomsAdmin = async (params = {}) => {
  return safeList(apiClient.get('/admin/rooms', { params }));
};

export const createRoom = async (payload) => {
  const res = await apiClient.post('/admin/rooms', payload);
  return extractObject(res.data);
};

export const updateRoom = async (id, payload) => {
  const res = await apiClient.put(`/admin/rooms/${id}`, payload);
  return extractObject(res.data);
};

export const deleteRoom = async (id) => {
  await apiClient.delete(`/admin/rooms/${id}`);
};

// =========================================================
// Catalog - Cosmetics (UC10)
// =========================================================

export const getCosmeticsAdmin = async (params = {}) => {
  return safeList(apiClient.get('/admin/cosmetics', { params }));
};

export const createCosmetic = async (payload) => {
  const res = await apiClient.post('/admin/cosmetics', payload);
  return extractObject(res.data);
};

export const updateCosmetic = async (id, payload) => {
  const res = await apiClient.put(`/admin/cosmetics/${id}`, payload);
  return extractObject(res.data);
};

export const deleteCosmetic = async (id) => {
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
  return safeList(apiClient.get('/admin/appointments', { params }));
};

export const getAdminAppointmentById = async (id) => {
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
 * bare list or an envelope { data | items | results }.
 *
 * Endpoint shape:
 *   GET /admin/inventory
 *   -> [ { id, cosmeticId, cosmetic:{...}, stock, minStock, lots:[...] } ]
 */
export const getInventory = async (params = {}) => {
  return safeList(apiClient.get('/admin/inventory', { params }));
};

/**
 * Fetch the lot/batch breakdown for a single inventory row.
 * Optional - only invoked when the user expands the row and the inventory
 * payload did not already include lots.
 */
export const getInventoryLots = async (inventoryId) => {
  if (!inventoryId) return [];
  return safeList(apiClient.get(`/admin/inventory/${inventoryId}/lots`));
};

/**
 * Update one lot/batch (e.g. adjust quantity, expiry).
 * Endpoint is best-effort: if the backend does not implement it the call
 * will surface a 404 to the caller.
 */
export const updateInventoryLot = async (inventoryId, lotId, payload) => {
  const res = await apiClient.put(
    `/admin/inventory/${inventoryId}/lots/${lotId}`,
    payload,
  );
  return extractObject(res.data);
};

/**
 * Stock-in: record an incoming batch.
 * The backend may combine this with the inventory upsert in one endpoint.
 */
export const stockInInventory = async (inventoryId, payload) => {
  const res = await apiClient.post(
    `/admin/inventory/${inventoryId}/stock-in`,
    payload,
  );
  return extractObject(res.data);
};

// =========================================================
// Invoices & Payments
// =========================================================

/**
 * List invoices. Supports optional filters: status, q, customerId, from, to.
 * status values we accept (case-insensitive):
 *   PENDING | UNPAID  -> Chờ thanh toán
 *   PAID              -> Đã thanh toán
 *   CANCELLED         -> Đã hủy
 *   REFUNDED          -> Đã hoàn tiền
 *   FAILED            -> Thanh toán thất bại
 */
export const getInvoices = async (params = {}) => {
  return safeList(apiClient.get('/admin/invoices', { params }));
};

/**
 * Fetch a single invoice by id, including line items and payment details.
 * Used by the detail modal.
 */
export const getInvoiceById = async (id) => {
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
 * The backend should compute the totals from the appointment + cosmetics;
 * the client only sends references. Optional cosmeticItems may adjust
 * quantities sold at checkout.
 */
export const createInvoiceFromAppointment = async (appointmentId, payload = {}) => {
  const res = await apiClient.post(
    `/admin/invoices/from-appointment/${appointmentId}`,
    payload,
  );
  return extractObject(res.data);
};

/**
 * Create a retail invoice (Flow 2) selling one or more cosmetics.
 * Backend may expose a generic POST /admin/invoices with a type=COSMETIC flag.
 */
export const createRetailInvoice = async (payload) => {
  const res = await apiClient.post('/admin/invoices', payload);
  return extractObject(res.data);
};

/**
 * Confirm payment on an invoice.
 * method accepts CASH or BANK_TRANSFER (case-insensitive on the wire).
 */
export const payInvoice = async (id, method, payload = {}) => {
  const res = await apiClient.post(`/admin/invoices/${id}/pay`, {
    method,
    ...payload,
  });
  return extractObject(res.data);
};

// =========================================================
// Reports & Statistics (UC12)
// =========================================================

/**
 * Fetch the admin reports overview for a period.
 * The endpoint is ideally a single call: GET /admin/reports?range=...
 * accepting either a preset (today|week|month|quarter|year) or from/to dates.
 * Accepts both an envelope ({ data | overview | summary }) and a flat object.
 *
 * Expected response shape (recommended):
 *   {
 *     revenue: { total, byDay, byMonth, byService, byCosmetic, topCosmetics },
 *     inventory: { totalStock },
 *     customers: { total, newCount },
 *     appointments: { total }
 *   }
 * However this is the OMAMORI frontend - the backend may not yet expose
 * all fields, so every field is read defensively and the page renders
 * what is available.
 */
export const getReportsOverview = async (params = {}) => {
  try {
    const res = await apiClient.get('/admin/reports', { params });
    return extractObject(res.data) || {};
  } catch (err) {
    if (err.response?.status === 404) return {};
    throw err;
  }
};

/**
 * Fetch a list of paid invoices in a period. Used to compute
 * revenue/service/cosmetic breakdown when the backend does not
 * pre-compute the report.
 * Accepts: status, from, to, range.
 */
export const getPaidInvoicesForReport = async (params = {}) => {
  const list = await safeList(
    apiClient.get('/admin/invoices', { params: { status: 'PAID', ...params } }),
  );
  return Array.isArray(list) ? list : [];
};

/**
 * Fetch new customers in a period. Used when the backend does not
 * return `customers.newCount` directly.
 */
export const getCustomersForReport = async (params = {}) => {
  return safeList(apiClient.get('/admin/customers', { params }));
};

/**
 * Fetch appointments in a period - used as a fallback revenue signal.
 */
export const getAppointmentsForReport = async (params = {}) => {
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
