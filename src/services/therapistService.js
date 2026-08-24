// Therapist API Service
import apiClient from './api';
import { therapistMock } from '@/mocks';

// Appointment status enum - mirrors backend enum AppointmentStatus exactly.
export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Display labels (Vietnamese).
export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: 'Chờ xác nhận',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Đã xác nhận',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'Đang trị liệu',
  [APPOINTMENT_STATUS.COMPLETED]: 'Hoàn thành',
  [APPOINTMENT_STATUS.CANCELLED]: 'Đã hủy',
};

// Badge variant per status - kept consistent with customer side.
export const APPOINTMENT_STATUS_VARIANTS = {
  [APPOINTMENT_STATUS.PENDING]: 'warning',
  [APPOINTMENT_STATUS.CONFIRMED]: 'info',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'success',
  [APPOINTMENT_STATUS.COMPLETED]: 'success',
  [APPOINTMENT_STATUS.CANCELLED]: 'error',
};

// Allowed forward transitions for the therapist state machine.
// FE-only responsibility is PENDING -> CONFIRMED and CONFIRMED -> IN_PROGRESS.
// IN_PROGRESS -> COMPLETED is gated by the treatment journal (backend).
export const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.PENDING]: [
    APPOINTMENT_STATUS.CONFIRMED,
  ],


  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.IN_PROGRESS,
  ],


  // COMPLETED phải đi qua lưu hồ sơ trị liệu.
  [APPOINTMENT_STATUS.IN_PROGRESS]: [],


  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
};

const USE_MOCK = import.meta.env.VITE_USE_MOCK_THERAPIST === 'true';

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


  if (
    payload &&
    Array.isArray(payload.result)
  ) {
    return payload.result;
  }


  if (
    payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }


  if (
    payload &&
    Array.isArray(payload.items)
  ) {
    return payload.items;
  }


  if (
    payload &&
    Array.isArray(payload.results)
  ) {
    return payload.results;
  }


  return [];
};

const extractObject = (payload) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return null;
  }


  if (
    payload.result &&
    typeof payload.result === 'object' &&
    !Array.isArray(payload.result)
  ) {
    return payload.result;
  }


  if (
    payload.data &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data)
  ) {
    return payload.data;
  }


  return payload;
};


const normalizeAppointment = (appointment) => {
  if (!appointment || typeof appointment !== 'object') {
    return null;
  }


  const rawAppointmentTime =
    appointment.appointmentTime || '';


  const [datePart = '', timePart = ''] =
    typeof rawAppointmentTime === 'string'
      ? rawAppointmentTime.split('T')
      : ['', ''];


  const date =
    appointment.date ??
    datePart ??
    '';


  const startTime =
    appointment.startTime ??
    appointment.time ??
    (timePart ? timePart.substring(0, 5) : '');


  return {
    ...appointment,


    date,
    startTime,
    time: appointment.time ?? startTime,


    price:
      appointment.price ??
      appointment.totalAmount ??
      appointment.servicePrice ??
      0,


    note:
      appointment.note ??
      appointment.notes ??
      '',


    notes:
      appointment.notes ??
      appointment.note ??
      '',


    service:
      appointment.service ?? {
        id: appointment.serviceId,
        name: appointment.serviceName ?? 'Dịch vụ',
        price: appointment.servicePrice ?? 0,
      },


    room:
      appointment.room ?? {
        id: appointment.roomId,
        name: appointment.roomName ?? 'Phòng',
        price: appointment.roomPrice ?? 0,
      },


    therapist:
      appointment.therapist ??
      (
        appointment.therapistId
          ? { id: appointment.therapistId }
          : null
      ),
  };
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
  const response = await apiClient.get('/appointments/therapist/me', { params });


  return extractList(response.data)
    .map(normalizeAppointment)
    .filter(Boolean);
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
  const response = await apiClient.get(`/appointments/therapist/me/${appointmentId}`);


  return normalizeAppointment(
    extractObject(response.data)
  );
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
    `/appointments/therapist/me/${appointmentId}/status`,
    { status }
  );


  return normalizeAppointment(
    extractObject(response.data)
  );
};

// ─── REJECT / CANCEL A WAITING APPOINTMENT ─────────────────────────────────────
// Therapist-only: the KTV rejects a PENDING appointment they own. The
// backend (PATCH /appointments/therapist/me/{id}/reject) verifies ownership
// and current status (must be PENDING) before flipping to CANCELLED.
export const rejectAppointment = async (appointmentId) => {
  if (USE_MOCK) {
    await _delay(300);
    const apt = _findApt(appointmentId);
    if (!apt) {
      const err = new Error('Không tìm thấy ca trị liệu.');
      err.response = { status: 404, data: { message: err.message } };
      throw err;
    }
    if (apt.status !== APPOINTMENT_STATUS.PENDING) {
      const err = new Error('Chỉ có thể từ chối lịch đang chờ xác nhận.');
      err.response = { status: 400, data: { message: err.message } };
      throw err;
    }
    return _updateApt(appointmentId, { status: APPOINTMENT_STATUS.CANCELLED });
  }
  const response = await apiClient.patch(
    `/appointments/therapist/me/${appointmentId}/reject`,
    {}
  );
  return normalizeAppointment(extractObject(response.data));
};

// ─── GET CUSTOMER TREATMENT HISTORY ───────────────────────────────────────────
// Real backend endpoint: GET /appointments/therapist/me/therapy-records/customer/{customerId}
// Returns records scoped to the calling therapist's appointments. Empty list is valid.
export const getCustomerTreatmentHistory = async (customerId, params = {}) => {
  if (!customerId) return [];
  if (USE_MOCK) {
    await _delay(200);
    return _mockHistory.filter((h) => String(h.customerId) === String(customerId));
  }
  const response = await apiClient.get(
    `/appointments/therapist/me/therapy-records/customer/${encodeURIComponent(customerId)}`,
    { params }
  );
  return extractList(response.data);
};

// ─── GET PRESCRIBABLE COSMETICS ───────────────────────────────────────────────
// Real backend: GET /cosmetics/  (public catalog). Returns Cosmetic list with
// stockQuantity + isActive. Therapist-only filter for active items is applied
// in the UI layer.
export const getPrescribableCosmetics = async (params = {}) => {
  if (USE_MOCK) {
    await _delay(200);
    return therapistMock.cosmetics || [];
  }
  const response = await apiClient.get('/cosmetics/', { params });
  return extractList(response.data);
};

// ─── SAVE PRESCRIPTION (DonMyPham) ────────────────────────────────────────────
// Real backend: POST /cosmetics/cosmetic-orders
// Body: { appointmentId, technicianId, note, items: [{ cosmeticId, quantity, usageInstruction }] }
// Backend checks stock availability but does NOT decrement stock — that
// happens at invoice/paid time. Unique-per-appointment constraint on backend.
export const savePrescription = async (payload) => {
  if (USE_MOCK) {
    await _delay(300);
    return { ...payload, id: _mockNextId++, createdAt: new Date().toISOString() };
  }
  const response = await apiClient.post('/cosmetics/cosmetic-orders', payload);
  return extractObject(response.data);
};

// ─── GET PRESCRIPTION BY APPOINTMENT ──────────────────────────────────────────
export const getPrescriptionByAppointment = async (appointmentId) => {
  const response = await apiClient.get(
    `/cosmetics/cosmetic-orders/appointment/${encodeURIComponent(appointmentId)}`
  );
  return extractObject(response.data);
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
    `/appointments/therapist/me/${appointmentId}/therapy-record`,
    payload
  );

  return extractObject(response.data);
};

// ─── GET TREATMENT RECORD ────────────────────────────────────────────────────

export const getTreatmentRecord = async (appointmentId) => {
  const response = await apiClient.get(
    `/appointments/therapist/me/${appointmentId}/therapy-record`
  );

  return extractObject(response.data);
};

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────

export const getMyProfile = async () => {
  if (USE_MOCK) {
    await _delay(150);
    return { ...therapistMock.profile };
  }
  const response = await apiClient.get('/profiles/me');
  const profile = response.data?.result ?? response.data;
  return {
    ...profile,
    name: profile?.fullName ?? '',
  };
};

// ─── UPDATE MY PROFILE ───────────────────────────────────────────────────────

export const updateMyProfile = async (payload) => {
  if (USE_MOCK) {
    await _delay(300);
    Object.assign(therapistMock.profile, payload);
    return { ...therapistMock.profile };
  }
  const response = await apiClient.put('/profiles/me', payload);
  const profile = response.data?.result ?? response.data;
  return {
    ...profile,
    name: profile?.fullName ?? '',
  };
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
  rejectAppointment,
  getCustomerTreatmentHistory,
  getPrescribableCosmetics,
  saveTreatmentJournal,
  getTreatmentRecord,
  getMyProfile,
  updateMyProfile,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  ALLOWED_TRANSITIONS,
  helpers,
};
