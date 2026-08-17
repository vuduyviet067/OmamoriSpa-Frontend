// Auth API Service
// Provides authentication functions with mock adapter support
// To use real API: set VITE_USE_MOCK_AUTH=false in .env

import apiClient from './api';

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
const mockDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// ============= MOCK IMPLEMENTATION =============
const mockAuth = {
  async login(username, password) {
    await mockDelay();

    // Check credentials
    let user = null;
    if (username === 'khachhang' && password === MOCK_PASSWORDS.customer) {
      user = MOCK_USERS.customer;
    } else if (username === 'kythuatvien' && password === MOCK_PASSWORDS.therapist) {
      user = MOCK_USERS.therapist;
    } else if (username === 'quantrivien' && password === MOCK_PASSWORDS.admin) {
      user = MOCK_USERS.admin;
    }

    if (!user) {
      const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      error.response = { status: 401, data: { message: 'Tên đăng nhập hoặc mật khẩu không đúng' } };
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

    // Simulate email/username check
    const existingUsers = ['khachhang', 'kythuatvien', 'quantrivien'];
    if (existingUsers.includes(data.username)) {
      const error = new Error('Tên đăng nhập đã tồn tại');
      error.response = { status: 400, data: { message: 'Tên đăng nhập đã tồn tại' } };
      throw error;
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      username: data.username,
      name: data.name,
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
  async login(username, password) {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  async register(data) {
    const response = await apiClient.post('/auth/register', {
      name: data.name,
      username: data.username,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async refreshToken(refreshToken) {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// ============= EXPORT =============
// Switch between mock and real API based on environment
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

// Mock getCurrentUser — restores the stored user from localStorage (simulates what
// a real /auth/me would return after the mock login stored it in AuthContext).
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

const authService = USE_MOCK ? mockAuth : realAuth;

export const login = (username, password) => authService.login(username, password);
export const register = (data) => authService.register(data);
export const getCurrentUser = () => (USE_MOCK ? mockGetCurrentUser() : realAuth.getCurrentUser());
export const refreshToken = () =>
  USE_MOCK ? mockRefreshToken() : realAuth.refreshToken();

export { MOCK_USERS, MOCK_PASSWORDS };
export default authService;
