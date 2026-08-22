// Customer API Service
import apiClient from './api';
import mocks from '@/mocks';

const USE_MOCK_DATA =
  import.meta.env.VITE_USE_MOCK_DATA === 'true';
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

const USE_MOCK_SERVICES =
  import.meta.env.VITE_USE_MOCK_SERVICES !== undefined
    ? import.meta.env.VITE_USE_MOCK_SERVICES === 'true'
    : USE_MOCK_DATA;


// =========================================================
// TRANSACTION NORMALIZER
// =========================================================

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

    amount:
      invoice.amount ??
      invoice.totalAmount ??
      0,

    total:
      invoice.total ??
      invoice.totalAmount ??
      0,

    date:
      invoice.date ??
      invoice.paidAt ??
      invoice.createdAt,

    items,
  };
};


// =========================================================
// COMMON HELPERS
// =========================================================

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


// =========================================================
// APPOINTMENT CONSTANTS
// =========================================================

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


// =========================================================
// TIME SLOTS
// =========================================================

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


// =========================================================
// RESPONSE HELPERS
// =========================================================

const extractList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
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


// =========================================================
// CONFLICT HELPER
// =========================================================

export const isConflictError = (err) => {
  if (!err) {
    return false;
  }

  const status = err.response?.status;

  if (
    status === 409 ||
    status === 422
  ) {
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


// =========================================================
// APPOINTMENT NORMALIZER
// =========================================================

const normalizeAppointment = (appointment) => {
  if (
    !appointment ||
    typeof appointment !== 'object'
  ) {
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
    (
      timePart
        ? timePart.substring(0, 5)
        : ''
    );

  return {
    ...appointment,

    date,

    startTime,

    time:
      appointment.time ??
      startTime,

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

        name:
          appointment.serviceName ??
          'Dịch vụ',

        price:
          appointment.servicePrice ??
          0,
      },

    room:
      appointment.room ?? {
        id: appointment.roomId,

        name:
          appointment.roomName ??
          'Phòng',

        price:
          appointment.roomPrice ??
          0,
      },

    therapist:
      appointment.therapist ??
      (
        appointment.therapistId
          ? {
              id: appointment.therapistId,
            }
          : null
      ),
  };
};


// =========================================================
// APPOINTMENT REQUEST MAPPER
// =========================================================

const toBackendAppointmentPayload = (
  payload = {}
) => {
  const rawTime =
    payload.startTime ||
    payload.time ||
    '';

  let appointmentTime =
    payload.appointmentTime ??
    null;

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
    serviceId:
      payload.serviceId,

    roomId:
      payload.roomId,

    therapistId:
      payload.therapistId ||
      null,

    appointmentTime,

    reason:
      payload.reason ??
      '',

    note:
      payload.note ??
      payload.notes ??
      '',
  };
};


// =========================================================
// CUSTOMER APPOINTMENTS
// =========================================================

/**
 * Get all appointments for the logged-in customer
 */
export const getMyAppointments = async () => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    return cloneList(
      mocks.customer?.appointments ||
      []
    );
  }

  const response =
    await apiClient.get(
      '/appointments/me'
    );

  const appointments =
    response.data?.result ??
    response.data;

  if (!Array.isArray(appointments)) {
    return [];
  }

  return appointments
    .map(normalizeAppointment)
    .filter(Boolean);
};


/**
 * Get one customer appointment
 */
export const getAppointmentById = async (
  appointmentId
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    const apt =
      (
        mocks.customer?.appointments ||
        []
      ).find(
        (a) =>
          String(a.id) ===
          String(appointmentId)
      );

    if (!apt) {
      const err =
        new Error(
          'Không tìm thấy lịch hẹn.'
        );

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

  const response =
    await apiClient.get(
      `/appointments/me/${appointmentId}`
    );

  return normalizeAppointment(
    response.data?.result ??
    response.data
  );
};


/**
 * Get upcoming appointments
 */
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
      (
        mocks.customer?.appointments ||
        []
      ).filter(
        (a) =>
          UPCOMING.includes(a.status)
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
      UPCOMING.includes(
        appointment.status
      )
  );
};


/**
 * Create appointment
 */
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
        (
          mocks.services ||
          []
        ).find(
          (s) =>
            String(s.id) ===
            String(payload.serviceId)
        ),

      therapist:
        (
          mocks.therapists ||
          []
        ).find(
          (t) =>
            String(t.id) ===
            String(payload.therapistId)
        ),

      room:
        (
          mocks.rooms ||
          []
        ).find(
          (r) =>
            String(r.id) ===
            String(payload.roomId)
        ),

      createdAt:
        new Date().toISOString(),
    };

    return newApt;
  }

  const requestBody =
    toBackendAppointmentPayload(
      payload
    );

  const response =
    await apiClient.post(
      '/appointments/me',
      requestBody
    );

  return normalizeAppointment(
    response.data?.result ??
    response.data
  );
};


/**
 * Update appointment
 */
export const updateAppointment = async (
  appointmentId,
  payload
) => {
  if (USE_MOCK_APPOINTMENTS) {
    await mockDelay();

    return cloneItem(payload);
  }

  const requestBody =
    toBackendAppointmentPayload(
      payload
    );

  const response =
    await apiClient.put(
      `/appointments/me/${appointmentId}`,
      requestBody
    );

  return normalizeAppointment(
    response.data?.result ??
    response.data
  );
};


/**
 * Cancel appointment
 */
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

  const response =
    await apiClient.patch(
      `/appointments/me/${appointmentId}/cancel`
    );

  return normalizeAppointment(
    response.data?.result ??
    response.data
  );
};


// =========================================================
// BOOKING SERVICES
// =========================================================

/**
 * Get list of available services for booking.
 */
export const getServices = async () => {
  if (USE_MOCK_SERVICES) {
    await mockDelay();

    return cloneList(
      mocks.services ||
      []
    );
  }

  const response =
    await apiClient.get(
      '/treatments/'
    );

  const services =
    response.data?.result ??
    response.data;

  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .filter(
      (service) =>
        service?.isActive !== false
    )
    .map(
      (service) => ({
        ...service,

        id:
          service.id,

        name:
          service.name ??
          'Dịch vụ',

        category:
          service.category ??
          '',

        price:
          service.price ??
          0,

        durationMinutes:
          service.durationMinutes ??
          null,

        description:
          service.description ??
          '',
      })
    );
};


// =========================================================
// THERAPISTS
// =========================================================

/**
 * Get list of therapists available for booking.
 */
export const getTherapists = async (
  params = {}
) => {
  if (USE_MOCK_THERAPISTS) {
    await mockDelay();

    return cloneList(
      mocks.therapists ||
      []
    );
  }

  const response =
    await apiClient.get(
      '/profiles/therapists',
      {
        params,
      }
    );

  const therapists =
    response.data?.result ??
    response.data;

  if (!Array.isArray(therapists)) {
    return [];
  }

  return therapists
    .filter(
      (therapist) =>
        therapist?.active !== false
    )
    .map(
      (therapist) => ({
        ...therapist,

        id:
          therapist.id,

        name:
          therapist.fullName ??
          'Kỹ thuật viên',

        specialty:
          therapist.specialization ??
          '',

        image:
          therapist.avatarUrl ??
          '',
      })
    );
};


// =========================================================
// ROOMS
// =========================================================

/**
 * Get list of rooms available for booking.
 */
export const getRooms = async (
  params = {}
) => {
  if (USE_MOCK_ROOMS) {
    await mockDelay();

    return cloneList(
      mocks.rooms ||
      []
    );
  }

  const response =
    await apiClient.get(
      '/rooms/',
      {
        params,
      }
    );

  const rooms =
    response.data?.result ??
    response.data;

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


// =========================================================
// CUSTOMER TRANSACTIONS
// =========================================================

/**
 * Get a single transaction by ID
 */
export const getTransactionById = async (
  transactionId
) => {
  if (USE_MOCK_TRANSACTIONS) {
    await mockDelay();

    const txn =
      (
        mocks.customer?.transactions ||
        []
      ).find(
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
          message:
            err.message,
        },
      };

      throw err;
    }

    return cloneItem(txn);
  }

  const response =
    await apiClient.get(
      `/payments/me/${transactionId}`
    );

  const invoice =
    response.data?.result ??
    response.data;

  return normalizeTransaction(
    invoice
  );
};


/**
 * Create VNPay payment URL
 * for invoice owned by logged-in customer.
 *
 * Backend contract (payment-service):
 *   POST /payments/me/{id}/vnpay/create
 *   Authorization: Bearer <CUSTOMER JWT>
 *   Response: ApiResponse<VnPayPaymentUrlResponse> where
 *     VnPayPaymentUrlResponse = { paymentUrl, txnRef }
 *
 * Error contract observed via direct gateway test (PENDING invoice,
 * merchant credentials empty in env): backend VNPayService.hmacSHA512 throws
 * InvalidKeyException which surfaces as HTTP 500 + ApiResponse
 *   { code: 9999, message: "Uncategorized error" }
 * (ErrorCode.UNCATEGORIZED_EXCEPTION = 9999 / INTERNAL_SERVER_ERROR).
 *
 * Scope rule (intentionally narrow):
 *  - Only remap when the failing call is exactly THIS POST vnpay/create,
 *    response status is HTTP 500, and the body code is exactly 9999.
 *  - 9999 is a generic "uncategorized" bucket on the backend and is also
 *    used for other unrelated failures, so we MUST gate by HTTP 500 + this
 *    exact endpoint to avoid swallowing real system errors elsewhere.
 *  - 1001 "Uncategorized error" (InvalidKey, BAD_REQUEST) is intentionally
 *    left untouched — caller renders backend message as-is.
 *  - 401/403/404/400 with non-9999 code: render backend message normally.
 *  - 500 with non-9999 code: render backend message normally.
 *
 * On the remapped case, we throw a fresh Error (no `err.response`) so the
 * existing error chain in Transactions.jsx
 *   err.response?.data?.message || err.message || fallback
 * picks up the friendly message and skips redirect / fake-success.
 */
export const createVnPayPayment = async (
  transactionId
) => {
  try {
    const response =
      await apiClient.post(
        `/payments/me/${transactionId}/vnpay/create`
      );

    return (
      response.data?.result ??
      response.data
    );
  } catch (err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    if (
      status === 500
      && code === 9999
    ) {
      const friendly = new Error(
        'Thanh toán trực tuyến hiện chưa được cấu hình.'
      );
      friendly.code = 'VNPAY_MERCHANT_NOT_CONFIGURED';
      throw friendly;
    }
    throw err;
  }
};


/**
 * Get transaction history for logged-in customer
 */
export const getMyTransactions = async () => {
  if (USE_MOCK_TRANSACTIONS) {
    await mockDelay();

    return cloneList(
      mocks.customer?.transactions ||
      []
    );
  }

  const response =
    await apiClient.get(
      '/payments/me'
    );

  const invoices =
    response.data?.result ??
    response.data ??
    [];

  return Array.isArray(invoices)
    ? invoices.map(
        normalizeTransaction
      )
    : [];
};


// =========================================================
// CUSTOMER PROFILE
// =========================================================

/**
 * Get customer profile
 */
export const getMyProfile = async () => {
  if (USE_MOCK_PROFILE) {
    await mockDelay();

    return cloneItem(
      mocks.customer?.profile ||
      {}
    );
  }

  const response =
    await apiClient.get(
      '/profiles/me'
    );

  const profile =
    response.data?.result ??
    response.data;

  return {
    ...profile,

    name:
      profile?.fullName ??
      '',
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
    response.data?.result ??
    response.data;

  return {
    ...profile,

    name:
      profile?.fullName ??
      '',
  };
};


// =========================================================
// HELPERS EXPOSED FOR COMPONENTS
// =========================================================

export const helpers = {
  extractList,
  extractObject,
  isConflictError,
};


// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  // Appointments
  getMyAppointments,
  getAppointmentById,
  getUpcomingAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,

  // Booking
  getServices,
  getTherapists,
  getRooms,
  getAvailableTimeSlots,

  // Transactions
  getMyTransactions,
  getTransactionById,
  createVnPayPayment,

  // Profile
  getMyProfile,
  updateMyProfile,

  // Helpers
  isConflictError,

  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  DEFAULT_TIME_SLOTS,

  helpers,
};