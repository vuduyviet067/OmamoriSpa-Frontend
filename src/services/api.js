// API Client - Axios instance with interceptors
// This file exports a configured axios instance for API calls

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888/api/omamori';

// Storage keys kept stable across mock and real modes so AuthContext
// session-restore and the Authorization header stay in sync.
export const STORAGE_KEYS = {
  USER: 'omamori_user',
  TOKEN: 'omamori_accessToken',
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Token invalid / expired - clear session and bounce to login.
          // Do NOT mock-fallback here; UI must surface the real error.
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - Can be handled by component or redirect
          console.error('Access forbidden:', data?.message || 'You do not have permission');
          break;
        case 404:
          console.error('Resource not found:', data?.message);
          break;
        case 500:
          console.error('Server error:', data?.message);
          break;
        default:
          console.error('API error:', data?.message);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection');
    } else {
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
