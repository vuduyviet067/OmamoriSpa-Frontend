// Auth API Service
// Provides authentication functions with mock/real adapter support.
// Real backend endpoints come from the SpaOmamori user-service contract:
//   - POST /users/auth/login   body: { email, password }  -> { result: { token } }
//   - POST /users/auth/create  body: { fullName, email, password, dateOfBirth, gender, phone, address }
// No public /auth/me or /auth/refresh endpoint exists in Phase 1.
// Session restoration is done client-side by decoding the JWT.
//
// Mock mode is preserved unchanged when VITE_USE_MOCK_AUTH=true.

import apiClient from './api';
import { decodeJwt, isJwtExpired } from '@/features/auth/jwt';
import { normalizeRole } from '@/features/auth/context/authConstants';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

// ============= MOCK DATA =============
const MOCK_USERS = {
  customer: {
    id: 1,
    username: 'khachhang',
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@email.com',
    phone: '0901234567',
    role: 'CUSTOMER',
  },
  therapist: {
    id: 2,
    username: 'kythuatvien',
    name: 'Trần Thị Linh',
    email: 'tranthilinh@email.com',
    phone: '0902345678',
    role: 'THERAPIST',
  },
  admin: {
    id: 3,
    username: 'quantrivien',
    name: 'Lê Quốc Minh',
    email: 'lequocminh@email.com',
    phone: '0903456789',
    role: 'ADMIN',
  },
};

const MOCK_PASSWORDS = {
  customer: 'Customer123',
  therapist: 'Therapist123',
  admin: 'Admin123',
};

// Mock delay helper
const mockDelay = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms));

// ============= MOCK IMPLEMENTATION ==============
// Mock mode mirrors the legacy dev experience. The actual login form now
// sends `email` (matching the real backend contract), so the mock lookup is
// keyed by username OR email to keep the demo accounts working.
const mockAuth = {
  async login(identifier, password) {
    await mockDelay();

    const id = String(identifier || '').trim().toLowerCase();

    const matches = (user) =>
      user.username.toLowerCase() === id || user.email.toLowerCase() === id;

    let user = null;
    if (matches(MOCK_USERS.customer) && password === MOCK_PASSWORDS.customer) {
      user = MOCK_USERS.customer;
    } else if (matches(MOCK_USERS.therapist) && password === MOCK_PASSWORDS.therapist) {
      user = MOCK_USERS.therapist;
    } else if (matches(MOCK_USERS.admin) && password === MOCK_PASSWORDS.admin) {
      user = MOCK_USERS.admin;
    }

    if (!user) {
      const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      error.response = { status: 401, data: { message: 'Tên đăng nhập hoặc mật khẩu không đúng' } };
      throw error;
    }

    const mockToken = `mock_jwt_${user.role}_${Date.now()}`;

    return {
      user,
      accessToken: mockToken,
    };
  },

  async register(data) {
    await mockDelay();

    const existingEmails = Object.values(MOCK_USERS).map((u) =>
      String(u.email || '').toLowerCase(),
    );
    if (existingEmails.includes(String(data.email || '').toLowerCase())) {
      const error = new Error('Email đã tồn tại');
      error.response = { status: 400, data: { message: 'Email đã tồn tại' } };
      throw error;
    }

    const newUser = {
      id: Date.now(),
      username: data.username ?? data.email,
      name: data.fullName ?? data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      address: data.address ?? null,
      role: 'CUSTOMER',
    };

    const mockToken = `mock_jwt_CUSTOMER_${Date.now()}`;

    return {
      user: newUser,
      accessToken: mockToken,
    };
  },
};

// ============= REAL IMPLEMENTATION =============
// The user-service contract is normalized here so consumers only need to
// pass plain email + password / registration fields and read the returned
// backend-shaped payload.

function extractApiError(err, fallbackMessage) {
  const status = err?.response?.status;
  const backendMessage = err?.response?.data?.message;
  if (backendMessage) return { message: backendMessage, status };
  if (err?.message) return { message: err.message, status };
  return { message: fallbackMessage, status };
}

function wrapApiError(err, fallbackMessage) {
  const { message, status } = extractApiError(err, fallbackMessage);
  const wrapped = new Error(message);
  wrapped.response = { status, data: { message } };
  return wrapped;
}

const realAuth = {
  async login(email, password) {
    try {
      const response = await apiClient.post('/users/auth/login', { email, password });
      // Backend returns: { code, result: { token } }
      const token = response?.data?.result?.token;
      if (!token) {
        throw wrapApiError(new Error('Phản hồi đăng nhập không hợp lệ'), 'Không nhận được token');
      }

      // Decode JWT to recover the user identity (sub) and role (scope).
      // The backend JWT is HS512-signed and contains: sub, iss, iat, exp, jti, scope.
      const claims = decodeJwt(token);
      const backendRole = claims?.scope;
      const frontendRole = normalizeRole(backendRole);
      const userId = claims?.sub || null;

      if (!frontendRole) {
        throw wrapApiError(new Error('Vai trò không hợp lệ'), 'Vai trò tài khoản không hợp lệ');
      }

      return {
        user: {
          id: userId,
          userId,
          role: frontendRole,
          backendRole,
          // No fullName/email/phone from backend on login — values will be
          // populated by the profile endpoints in future phases. Keep the
          // legacy keys `null` so downstream UI shows its fallback.
          name: null,
          email: email,
          username: null,
          phone: null,
        },
        accessToken: token,
      };
    } catch (err) {
      // Never silently fall back to mock auth in real mode.
      if (err?.response) throw err;
      throw wrapApiError(err, 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  },

  async register(payload) {
    // payload: { fullName, email, password, dateOfBirth, gender, phone, address }
    try {
      const response = await apiClient.post('/users/auth/create', payload);
      // Backend returns: { code, result: UserCreationResponse }
      // UserCreationResponse currently echoes the password — we MUST ignore it.
      const result = response?.data?.result || null;
      if (result && typeof result === 'object' && 'password' in result) {
        delete result.password;
      }
      return { result };
    } catch (err) {
      if (err?.response) throw err;
      throw wrapApiError(err, 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  },
};

// ============= EXPORTS =============
const authService = USE_MOCK ? mockAuth : realAuth;

export const login = (email, password) => authService.login(email, password);
export const register = (data) => authService.register(data);

// No public /auth/me in Phase 1 — session restore happens in AuthContext by
// decoding the stored JWT. Export a helper for callers that already have a
// token and need the next session shape.
export function parseTokenSession(token) {
  const claims = decodeJwt(token);
  if (!claims) return null;
  if (isJwtExpired(claims)) return { expired: true };
  const backendRole = claims?.scope;
  const frontendRole = normalizeRole(backendRole);
  if (!frontendRole) return null;
  return {
    user: {
      id: claims?.sub || null,
      userId: claims?.sub || null,
      role: frontendRole,
      backendRole,
      name: null,
      email: null,
      username: null,
      phone: null,
    },
  };
}

export { MOCK_USERS, MOCK_PASSWORDS };
export default authService;
