// Customer API Service
import apiClient from './api';
import mocks from '@/mocks';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
// ↑ When false, 404 errors from lookup endpoints are surfaced as UI errors.

const USE_MOCK_PROFILE =
  import.meta.env.VITE_USE_MOCK_PROFILE !== undefined
    ? import.meta.env.VITE_USE_MOCK_PROFILE === 'true'
    : USE_MOCK_DATA;

const USE_MOCK_ROOMS =
  import.meta.env.VITE_USE_MOCK_ROOMS !== undefined
    ? import.meta.env.VITE_USE_MOCK_ROOMS === 'true'
    : USE_MOCK_DATA;

const USE_MOCK_THERAPISTS =
  import.meta.env.VITE_USE_MOCK_THERAPISTS !== undefined
    ? import.meta.env.VITE_USE_MOCK_THERAPISTS === 'true'
    : USE_MOCK_DATA;

const USE_MOCK_APPOINTMENTS =
  import.meta.env.VITE_USE_MOCK_APPOINTMENTS !== undefined
    ? import.meta.env.VITE_USE_MOCK_APPOINTMENTS === 'true'
    : USE_MOCK_DATA;

const USE_MOCK_TRANSACTIONS =
  import.meta.env.VITE_USE_MOCK_TRANSACTIONS !== undefined
    ? import.meta.env.VITE_USE_MOCK_TRANSACTIONS === 'true'
    : USE_MOCK_DATA;

const normalizeTransaction = (invoice = {}) => {
  const normalizedStatus =
    invoice.status === 'PENDING_PAYMENT'
      ? 'PENDING'
      : invoice.status;

  const items = Array.isArray(invoice.items)
    ? invoice.items.map((item) => ({
        ...item,
        type: item.type ?? item.itemType,
        name: item.name ?? item.itemName,
        total: item.total ?? item.subtotal,
      }))
    : [];

  return {
    ...invoice,
    status: normalizedStatus,
    amount: invoice.amount ?? invoice.totalAmount ?? 0,
    total: invoice.total ?? invoice.totalAmount ?? 0,
    date: invoice.date ?? invoice.paidAt ?? invoice.createdAt,
    items,
  };
};

const mockDelay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const cloneList = (list) =>
  Array.isArray(list)
    ? list.map((item) => ({ ...item }))
    : [];

const cloneItem = (item) =>
  item && typeof item === 'object'
    ? { ...item }
    : null;

const USE_MOCK_SERVICES =
  import.meta.env.VITE_USE_MOCK_SERVICES !== undefined
    ? import.meta.env.VITE_USE_MOCK_SERVICES === 'true'
    : USE_MOCK_DATA;

// Appointment Status enum
export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACCEPTED: 'ACCEPTED',
  IN_TREATMENT: 'IN_TREATMENT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Status display labels
export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: 'Chờ xác nhận',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Đã xác nhận',
  [APPOINTMENT_STATUS.ACCEPTED]: 'Đã tiếp nhận',
  [APPOINTMENT_STATUS.IN_TREATMENT]: 'Đang trị liệu',
  [APPOINTMENT_STATUS.COMPLETED]: 'Hoàn thành',
  [APPOINTMENT_STATUS.CANCELLED]: 'Đã hủy',
};

// Status variant for badge styling
export const APPOINTMENT_STATUS_VARIANTS = {
  [APPOINTMENT_STATUS.PENDING]: 'warning',
  [APPOINTMENT_STATUS.CONFIRMED]: 'info',
  [APPOINTMENT_STATUS.ACCEPTED]: 'info',
  [APPOINTMENT_STATUS.IN_TREATMENT]: 'success',
  [APPOINTMENT_STATUS.COMPLETED]: 'success',
  [APPOINTMENT_STATUS.CANCELLED]: 'error',
};

// Default business time slots (HH:mm)
export const DEFAULT_TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

export const getAvailableTimeSlots = async () => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();
  }

  return DEFAULT_TIME_SLOTS;
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.results)) return payload.results;

  return [];
};

const extractObject = (payload) => {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload)
  ) {
    if (
      payload.data &&
      typeof payload.data === 'object'
    ) {
      return payload.data;
    }

    return payload;
  }

  return null;
};

export const isConflictError = (err) => {
  if (!err) return false;

  const status = err.response?.status;

  if (status === 409 || status === 422) {
    return true;
  }

  const code =
    err.response?.data?.code ||
    err.response?.data?.errorCode;

  if (
    typeof code === 'string' &&
    /conflict|busy|slot|occupied/i.test(code)
  ) {
    return true;
  }

  const message =
    err.response?.data?.message ||
    err.message ||
    '';

  return /conflict|trùng|bận|đã có lịch|busy|occupied|already booked/i.test(
    message
  );
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

const toBackendAppointmentPayload = (payload = {}) => {
  const rawTime =
    payload.startTime ||
    payload.time ||
    '';

  let appointmentTime =
    payload.appointmentTime ?? null;

  if (
    !appointmentTime &&
    payload.date &&
    rawTime
  ) {
    const normalizedTime =
      rawTime.length === 5
        ? `${rawTime}:00`
        : rawTime;

    appointmentTime =
      `${payload.date}T${normalizedTime}`;
  }

  return {
    serviceId: payload.serviceId,
    roomId: payload.roomId,
    therapistId: payload.therapistId || null,
    appointmentTime,
    reason: payload.reason ?? '',
    note: payload.note ?? payload.notes ?? '',
  };
};

/**
 * Get all appointments for the logged-in customer
 */
export const getMyAppointments = async () => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    return cloneList(
      mocks.customer?.appointments || []
    );
  }

  const response =
    await apiClient.get('/appointments/me');

  const appointments =
    response.data?.result ?? response.data;

  if (!Array.isArray(appointments)) {
    return [];
  }

  return appointments
    .map(normalizeAppointment)
    .filter(Boolean);
};

export const getAppointmentById = async (
  appointmentId
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    const apt =
      (mocks.customer?.appointments || []).find(
        (a) =>
          String(a.id) ===
          String(appointmentId)
      );

    if (!apt) {
      const err =
        new Error('Không tìm thấy lịch hẹn.');

      err.response = {
        status: 404,
        data: {
          message: err.message,
        },
      };

      throw err;
    }

    return cloneItem(apt);
  }

  const response = await apiClient.get(
    `/appointments/me/${appointmentId}`
  );

  return normalizeAppointment(
    response.data?.result ?? response.data
  );
};

export const getUpcomingAppointments = async () => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    const UPCOMING = [
      'PENDING',
      'CONFIRMED',
      'ACCEPTED',
      'IN_TREATMENT',
    ];

    return cloneList(
      (mocks.customer?.appointments || []).filter(
        (a) => UPCOMING.includes(a.status)
      )
    );
  }

  const appointments =
    await getMyAppointments();

  const UPCOMING = [
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
  ];

  return appointments.filter(
    (appointment) =>
      UPCOMING.includes(appointment.status)
  );
};

export const createAppointment = async (
  payload
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    const newApt = {
      id: Date.now(),
      ...payload,
      status: 'PENDING',

      service:
        (mocks.services || []).find(
          (s) =>
            String(s.id) ===
            String(payload.serviceId)
        ),

      therapist:
        (mocks.therapists || []).find(
          (t) =>
            String(t.id) ===
            String(payload.therapistId)
        ),

      room:
        (mocks.rooms || []).find(
          (r) =>
            String(r.id) ===
            String(payload.roomId)
        ),

      createdAt: new Date().toISOString(),
    };

    return newApt;
  }

  const requestBody =
    toBackendAppointmentPayload(payload);

  const response = await apiClient.post(
    '/appointments/me',
    requestBody
  );

  return normalizeAppointment(
    response.data?.result ?? response.data
  );
};

export const updateAppointment = async (
  appointmentId,
  payload
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();
    return cloneItem(payload);
  }

  const requestBody =
    toBackendAppointmentPayload(payload);

  const response = await apiClient.put(
    `/appointments/me/${appointmentId}`,
    requestBody
  );

  return normalizeAppointment(
    response.data?.result ?? response.data
  );
};

/**
 * Get list of available services for booking.
 */
export const getServices = async () => {
  if (USE_MOCK_SERVICES) {
    await mockDelay();
    return cloneList(mocks.services || []);
  }

  const response =
    await apiClient.get('/treatments/');

  const services =
    response.data?.result ?? response.data;

  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .filter(
      (service) =>
        service?.isActive !== false
    )
    .map((service) => ({
      ...service,
      id: service.id,
      name:
        service.name ?? 'Dịch vụ',
      category:
        service.category ?? '',
      price:
        service.price ?? 0,
      durationMinutes:
        service.durationMinutes ?? null,
      description:
        service.description ?? '',
    }));
};

/**
 * Get list of therapists available for booking.
 */
export const getTherapists = async (
  params = {}
) => {
  if (USE_MOCK_THERAPISTS) {
    await mockDelay();
    return cloneList(mocks.therapists || []);
  }

  const response = await apiClient.get(
    '/profiles/therapists',
    { params }
  );

  const therapists =
    response.data?.result ?? response.data;

  if (!Array.isArray(therapists)) {
    return [];
  }

  return therapists
    .filter(
      (therapist) =>
        therapist?.active !== false
    )
    .map((therapist) => ({
      ...therapist,
      id: therapist.id,
      name:
        therapist.fullName ??
        'Kỹ thuật viên',
      specialty:
        therapist.specialization ?? '',
      image:
        therapist.avatarUrl ?? '',
    }));
};

/**
 * Get list of rooms available for booking.
 */
export const getRooms = async (
  params = {}
) => {
  if (USE_MOCK_ROOMS) {
    await mockDelay();
    return cloneList(mocks.rooms || []);
  }

  const response = await apiClient.get(
    '/rooms/',
    { params }
  );

  const rooms =
    response.data?.result ?? response.data;

  if (!Array.isArray(rooms)) {
    return [];
  }

  return rooms.filter(
    (room) =>
      room?.isActive !== false &&
      (
        room?.status == null ||
        room.status === 'AVAILABLE'
      )
  );
};

/**
 * Get a single transaction by ID
 */
export const getTransactionById = async (
  transactionId
) => {
  if (USE_MOCK_TRANSACTIONS) {
    await mockDelay();

    const txn =
      (mocks.customer?.transactions || []).find(
        (t) =>
          String(t.id) ===
          String(transactionId)
      );

    if (!txn) {
      const err =
        new Error(
          'Không tìm thấy giao dịch.'
        );

      err.response = {
        status: 404,
        data: {
          message: err.message,
        },
      };

      throw err;
    }

    return cloneItem(txn);
  }

  const response = await apiClient.get(
    `/payments/me/${transactionId}`
  );

  const invoice =
    response.data?.result ?? response.data;

  return normalizeTransaction(invoice);
};

/**
 * Get customer profile
 */
export const getMyProfile = async () => {
  if (USE_MOCK_PROFILE) {
    await mockDelay();

    return cloneItem(
      mocks.customer?.profile || {}
    );
  }

  const response =
    await apiClient.get('/profiles/me');

  const profile =
    response.data?.result ?? response.data;

  return {
    ...profile,
    name: profile?.fullName ?? '',
  };
};

/**
 * Update customer profile
 */
export const updateMyProfile = async (
  data
) => {
  if (USE_MOCK_PROFILE) {
    await mockDelay();
    return cloneItem(data);
  }

  const response =
    await apiClient.put(
      '/profiles/me',
      data
    );

  const profile =
    response.data?.result ?? response.data;

  return {
    ...profile,
    name: profile?.fullName ?? '',
  };
};

/**
 * Get transaction history for logged-in customer
 */
export const getMyTransactions = async () => {
  if (USE_MOCK_TRANSACTIONS) {
    await mockDelay();

    return cloneList(
      mocks.customer?.transactions || []
    );
  }

  const response =
    await apiClient.get('/payments/me');

  const invoices =
    response.data?.result ??
    response.data ??
    [];

  return Array.isArray(invoices)
    ? invoices.map(normalizeTransaction)
    : [];
};

export const cancelAppointment = async (
  appointmentId,
  reason = ''
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    return {
      id: appointmentId,
      status: 'CANCELLED',
      reason,
    };
  }

  const response = await apiClient.patch(
    `/appointments/me/${appointmentId}/cancel`
  );

  return normalizeAppointment(
    response.data?.result ?? response.data
  );
};

/**
 * Helpers exposed for components
 */
export const helpers = {
  extractList,
  extractObject,
  isConflictError,
};

export default {
  getMyAppointments,
  getAppointmentById,
  getUpcomingAppointments,
  createAppointment,
  updateAppointment,
  getServices,
  getTherapists,
  getRooms,
  getAvailableTimeSlots,
  getMyTransactions,
  getTransactionById,
  getMyProfile,
  updateMyProfile,
  cancelAppointment,
  isConflictError,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  DEFAULT_TIME_SLOTS,
  helpers,
};