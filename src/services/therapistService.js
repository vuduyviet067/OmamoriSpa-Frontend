// Therapist API Service
import apiClient from './api';
import { therapistMock } from '@/mocks';

// Appointment status enum - mirrors customer side for shared understanding.
export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACCEPTED: 'ACCEPTED',
  IN_TREATMENT: 'IN_TREATMENT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Display labels (Vietnamese).
export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: 'Chờ xác nhận',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Đã xác nhận',
  [APPOINTMENT_STATUS.ACCEPTED]: 'Đã tiếp nhận',
  [APPOINTMENT_STATUS.IN_TREATMENT]: 'Đang trị liệu',
  [APPOINTMENT_STATUS.COMPLETED]: 'Hoàn thành',
  [APPOINTMENT_STATUS.CANCELLED]: 'Đã hủy',
};

// Badge variant per status - kept consistent with customer side.
export const APPOINTMENT_STATUS_VARIANTS = {
  [APPOINTMENT_STATUS.PENDING]: 'warning',
  [APPOINTMENT_STATUS.CONFIRMED]: 'info',
  [APPOINTMENT_STATUS.ACCEPTED]: 'info',
  [APPOINTMENT_STATUS.IN_TREATMENT]: 'success',
  [APPOINTMENT_STATUS.COMPLETED]: 'success',
  [APPOINTMENT_STATUS.CANCELLED]: 'error',
};

// Allowed forward transitions for the therapist state machine.
// Therapists can only move: CONFIRMED -> ACCEPTED -> IN_TREATMENT -> COMPLETED.
export const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.PENDING]: [APPOINTMENT_STATUS.ACCEPTED],
  [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.ACCEPTED],
  [APPOINTMENT_STATUS.ACCEPTED]: [APPOINTMENT_STATUS.IN_TREATMENT],
  [APPOINTMENT_STATUS.IN_TREATMENT]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
};

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// In-memory mock state (persists across renders within the session).
let _mockAppointments = therapistMock.appointments.map((apt) => ({ ...apt }));
let _mockHistory = therapistMock.history.map((h) => ({ ...h }));
let _mockNextId = 999;

// --- Mock helpers ---

const _findApt = (id) => _mockAppointments.find((a) => String(a.id) === String(id));

const _updateApt = (id, patch) => {
  _mockAppointments = _mockAppointments.map((a) =>
    String(a.id) === String(id) ? { ...a, ...patch } : a
  );
  return _findApt(id);
};

const _delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Format an ISO/local date as `YYYY-MM-DD` for backend date params.
 */
export const toISODate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    if (date.length >= 10) return date.substring(0, 10);
    return date;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── GET MY SCHEDULE ───────────────────────────────────────────────────────────

export const getMySchedule = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(200);
    return [..._mockAppointments];
  }
  const response = await apiClient.get('/appointments/my', { params });
  return extractList(response.data);
};

// ─── GET APPOINTMENT BY ID ────────────────────────────────────────────────────

export const getAppointmentById = async (appointmentId) => {
  if (USE_MOCK) {
    await _delay(150);
    const apt = _findApt(appointmentId);
    if (!apt) {
      const err = new Error('Không tìm thấy ca trị liệu.');
      err.response = { status: 404, data: { message: err.message } };
      throw err;
    }
    return { ...apt };
  }
  const response = await apiClient.get(`/appointments/${appointmentId}`);
  return extractObject(response.data);
};

// ─── UPDATE APPOINTMENT STATUS ────────────────────────────────────────────────

export const updateAppointmentStatus = async (appointmentId, status) => {
  if (USE_MOCK) {
    await _delay(300);
    const apt = _findApt(appointmentId);
    if (!apt) {
      const err = new Error('Không tìm thấy ca trị liệu.');
      err.response = { status: 404, data: { message: err.message } };
      throw err;
    }
    const allowed = ALLOWED_TRANSITIONS[apt.status] || [];
    if (!allowed.includes(status)) {
      const err = new Error(`Không thể chuyển từ "${apt.status}" sang "${status}".`);
      err.response = { status: 400, data: { message: err.message } };
      throw err;
    }
    return _updateApt(appointmentId, { status });
  }
  const response = await apiClient.patch(
    `/appointments/${appointmentId}/status`,
    { status }
  );
  return extractObject(response.data);
};

// ─── GET CUSTOMER TREATMENT HISTORY ───────────────────────────────────────────

export const getCustomerTreatmentHistory = async (customerId, params = {}) => {
  if (!customerId) return [];
  if (USE_MOCK) {
    await _delay(200);
    return _mockHistory.filter((h) => String(h.customerId) === String(customerId));
  }
  const response = await apiClient.get(`/therapists/customers/${customerId}/treatments`, { params });
  return extractList(response.data);
};

// ─── GET PRESCRIBABLE COSMETICS ───────────────────────────────────────────────

export const getPrescribableCosmetics = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(200);
    return therapistMock.cosmetics || [];
  }
  const response = await apiClient.get('/therapists/cosmetics', { params });
  return extractList(response.data);
};

// ─── SAVE TREATMENT JOURNAL ───────────────────────────────────────────────────

export const saveTreatmentJournal = async (appointmentId, payload) => {
  if (USE_MOCK) {
    await _delay(400);
    const apt = _findApt(appointmentId);
    if (!apt) {
      const err = new Error('Không tìm thấy ca trị liệu.');
      err.response = { status: 404, data: { message: err.message } };
      throw err;
    }
    const entry = {
      id: _mockNextId++,
      appointmentId: Number(appointmentId),
      customerId: apt.customer?.id || apt.customerId,
      customerName: apt.customerName,
      date: toISODate(new Date()),
      serviceName: apt.serviceName,
      notes: payload.notes,
      outcome: payload.outcome,
      cosmetics: (payload.prescription || []).map((p) => {
        const c = therapistMock.cosmetics?.find((c) => String(c.id) === String(p.cosmeticId));
        return { cosmeticId: p.cosmeticId, cosmeticName: c?.name || 'Mỹ phẩm', quantity: p.quantity };
      }),
    };
    _mockHistory.unshift(entry);
    return entry;
  }
  const response = await apiClient.post(
    `/therapists/appointments/${appointmentId}/treatment`,
    payload
  );
  return extractObject(response.data);
};

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────

export const getMyProfile = async () => {
  if (USE_MOCK) {
    await _delay(150);
    return { ...therapistMock.profile };
  }
  const response = await apiClient.get('/therapists/profile');
  return extractObject(response.data);
};

// ─── UPDATE MY PROFILE ───────────────────────────────────────────────────────

export const updateMyProfile = async (payload) => {
  if (USE_MOCK) {
    await _delay(300);
    Object.assign(therapistMock.profile, payload);
    return { ...therapistMock.profile };
  }
  const response = await apiClient.put('/therapists/profile', payload);
  return extractObject(response.data);
};

/**
 * Helpers exposed for components.
 */
export const helpers = {
  extractList,
  extractObject,
};

export default {
  getMySchedule,
  getAppointmentById,
  updateAppointmentStatus,
  getCustomerTreatmentHistory,
  getPrescribableCosmetics,
  saveTreatmentJournal,
  getMyProfile,
  updateMyProfile,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  ALLOWED_TRANSITIONS,
  helpers,
};
