// Auth API Service
// Provides authentication functions with mock adapter support
// To use real API: set VITE_USE_MOCK_AUTH=false in .env

import apiClient from './api';

// ============= FINAL BACKEND CONSTANTS =============
// API paths relative to VITE_API_URL (which is http://localhost:8888/api/omamori)
// Gateway strips /api/omamori prefix, routes to user-service at /users
// UserController: @RequestMapping("/auth")
const API_AUTH_LOGIN = '/users/auth/login';
const API_AUTH_REGISTER = '/users/auth/create';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

// ============= BACKEND ROLE ADAPTER =============
// Backend Role enum: CUSTOMER, THERAPIST, ADMIN
// Frontend roles: CUSTOMER, THERAPIST, ADMIN
// Direct 1:1 mapping
const BACKEND_ROLES = {
  CUSTOMER: 'CUSTOMER',
  THERAPIST: 'THERAPIST',
  ADMIN: 'ADMIN',
};

// ============= MOCK DATA =============
// Mock users include both 'name' and 'fullName' for backward compatibility
// with existing FE components that consume user.name
const MOCK_USERS = {
  customer: {
    id: 1,
    name: 'Nguyễn Văn A',
    fullName: 'Nguyễn Văn A',
    email: 'khachhang@email.com',
    phone: '0901234567',
    role: 'CUSTOMER',
  },
  therapist: {
    id: 2,
    name: 'Trần Thị Linh',
    fullName: 'Trần Thị Linh',
    email: 'kythuatvien@email.com',
    phone: '0902345678',
    role: 'THERAPIST',
  },
  admin: {
    id: 3,
    name: 'Lê Quốc Minh',
    fullName: 'Lê Quốc Minh',
    email: 'quantrivien@email.com',
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
const mockDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// ============= MOCK IMPLEMENTATION =============
const mockAuth = {
  async login(email, password) {
    await mockDelay();

    // Check credentials
    let user = null;
    if (email === 'khachhang@email.com' && password === MOCK_PASSWORDS.customer) {
      user = { ...MOCK_USERS.customer };
    } else if (email === 'kythuatvien@email.com' && password === MOCK_PASSWORDS.therapist) {
      user = { ...MOCK_USERS.therapist };
    } else if (email === 'quantrivien@email.com' && password === MOCK_PASSWORDS.admin) {
      user = { ...MOCK_USERS.admin };
    }

    if (!user) {
      const error = new Error('Sai tài khoản hoặc mật khẩu');
      error.response = { status: 401, data: { message: 'Sai tài khoản hoặc mật khẩu' } };
      throw error;
    }

    // Generate mock JWT (in real app, this comes from server)
    const mockToken = `mock_jwt_${user.role}_${Date.now()}`;

    return {
      user,
      accessToken: mockToken,
    };
  },

  async register(data) {
    await mockDelay();

    // Simulate email check
    const existingEmails = ['khachhang@email.com', 'kythuatvien@email.com', 'quantrivien@email.com'];
    if (existingEmails.includes(data.email)) {
      const error = new Error('Người dùng đã tồn tại');
      error.response = { status: 400, data: { code: 1002, message: 'Người dùng đã tồn tại' } };
      throw error;
    }

    // Create new user with both name and fullName for FE compatibility
    const newUser = {
      id: Date.now(),
      name: data.fullName, // Backward compatibility
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: 'CUSTOMER', // Always CUSTOMER for self-registration
    };

    const mockToken = `mock_jwt_CUSTOMER_${Date.now()}`;

    return {
      user: newUser,
      accessToken: mockToken,
    };
  },
};

// ============= API IMPLEMENTATION =============
const realAuth = {
  /**
   * Login to FINAL backend
   * Endpoint: POST /users/auth/login (relative to VITE_API_URL)
   * Request: { email, password }
   * Response: ApiResponse<LoginResponse> where LoginResponse = { token }
   */
  async login(email, password) {
    const response = await apiClient.post(API_AUTH_LOGIN, { email, password });
    // Response shape: { code: 1000, message: "...", result: { token: "..." } }
    const { result } = response.data;
    return {
      accessToken: result.token,
      user: null, // Will be populated from JWT in AuthContext
    };
  },

  /**
   * Register new customer on FINAL backend
   * Endpoint: POST /users/auth/create (relative to VITE_API_URL)
   * Request: UserCreationRequest = { fullName, email, password, dateOfBirth, gender, phone, address }
   * Response: ApiResponse<UserCreationResponse>
   *
   * NOTE: Registration does NOT return a token. The RegisterPage handles navigation
   * to login page after successful registration. This allows user to login with
   * their chosen credentials.
   */
  async register(data) {
    const requestPayload = {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      dateOfBirth: data.dateOfBirth, // Format: YYYY-MM-DD (LocalDate)
      gender: data.gender, // MALE | FEMALE | OTHER
      phone: data.phone,
      address: data.address,
    };
    const response = await apiClient.post(API_AUTH_REGISTER, requestPayload);
    // Return sanitized response - no token, user should login separately
    return {
      user: null, // User will login after redirect
      registrationResult: response.data,
    };
  },
};

// ============= JWT DECODE (Client-side only, for session restore) =============
/**
 * Decode JWT token to extract claims.
 * NOTE: This is for UI/session only, NOT for security verification.
 * The actual security verification is done by the backend.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Normalize backend role to frontend role.
 * Returns null if role is unknown/invalid (session will be rejected).
 *
 * Backend Role enum: CUSTOMER, THERAPIST, ADMIN
 * Frontend roles: CUSTOMER, THERAPIST, ADMIN
 */
function normalizeRole(backendRole) {
  if (!backendRole) return null;

  // Direct mapping from backend to frontend
  if (BACKEND_ROLES[backendRole]) {
    return BACKEND_ROLES[backendRole];
  }

  // Unknown role - must return null to reject session
  console.error(`Unknown role from backend: ${backendRole}, session will be rejected`);
  return null;
}

/**
 * Extract user info from JWT token.
 * JWT claims from FINAL backend:
 * - sub: user ID
 * - scope: role (e.g., "CUSTOMER")
 * - iss: "Omamori.com"
 * - iat: issue time
 * - exp: expiration time
 * - jti: JWT ID
 *
 * Returns null if JWT is invalid or role is unknown.
 */
function extractUserFromJwt(token) {
  const claims = parseJwt(token);
  if (!claims) return null;

  // Validate required claims
  if (!claims.sub) {
    console.error('JWT missing required claim: sub (user ID)');
    return null;
  }

  const role = normalizeRole(claims.scope);
  if (!role) {
    // Unknown or missing role - reject session
    console.error('JWT has unknown or missing role:', claims.scope);
    return null;
  }

  return {
    id: claims.sub,
    role: role,
    email: claims.email || null, // email not in JWT, only in user table
  };
}

// ============= MOCK HELPERS =============
const mockGetCurrentUser = async () => {
  await mockDelay(100);
  const stored = localStorage.getItem('omamori_user');
  if (stored) {
    try {
      return { user: JSON.parse(stored) };
    } catch {
      // fall through to throw
    }
  }
  const err = new Error('Chưa đăng nhập.');
  err.response = { status: 401, data: { message: err.message } };
  throw err;
};

const mockRefreshToken = async () => {
  await mockDelay(100);
  const token = localStorage.getItem('omamori_accessToken');
  return { accessToken: token || `mock_jwt_refreshed_${Date.now()}` };
};

// ============= EXPORT =============
const authService = USE_MOCK ? mockAuth : realAuth;

export const login = (email, password) => authService.login(email, password);
export const register = (data) => authService.register(data);
export const getCurrentUser = () => (USE_MOCK ? mockGetCurrentUser() : Promise.reject(new Error('No /me endpoint in FINAL backend')));
export const refreshToken = () =>
  USE_MOCK ? mockRefreshToken() : Promise.reject(new Error('No refresh endpoint in FINAL backend'));

export { extractUserFromJwt, normalizeRole, parseJwt, MOCK_USERS, MOCK_PASSWORDS, BACKEND_ROLES };
export default authService;
