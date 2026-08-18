import { createContext, useState, useCallback, useEffect } from 'react';
import { login as loginApi, register as registerApi, extractUserFromJwt } from '@/services/authService';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USER: 'omamori_user',
  TOKEN: 'omamori_accessToken',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and JWT on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (storedUser && storedToken) {
      try {
        // Parse stored user
        const parsedUser = JSON.parse(storedUser);

        // Re-extract role from JWT to ensure it's up-to-date and valid
        const jwtUser = extractUserFromJwt(storedToken);
        if (jwtUser) {
          // Valid JWT - merge stored user info with JWT role
          setUser({ ...parsedUser, role: jwtUser.role });
        } else {
          // Invalid/malformed JWT or unknown role - reject session
          console.warn('Invalid or expired session, clearing credentials');
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          setUser(null);
          setAccessToken(null);
          setLoading(false);
          return;
        }
        setAccessToken(storedToken);
      } catch (e) {
        console.warn('Error parsing stored user, clearing credentials');
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        setUser(null);
        setAccessToken(null);
      }
    } else if (storedToken) {
      // Token exists but no stored user - extract from JWT
      const jwtUser = extractUserFromJwt(storedToken);
      if (jwtUser) {
        setUser({ id: jwtUser.id, role: jwtUser.role, email: jwtUser.email });
        setAccessToken(storedToken);
      } else {
        // Invalid JWT or unknown role - clean up
        console.warn('Invalid or expired token, clearing');
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        setUser(null);
        setAccessToken(null);
      }
    }
    setLoading(false);
  }, []);

  // Save to localStorage when user/token changes
  useEffect(() => {
    if (user && accessToken) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }, [user, accessToken]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await loginApi(email, password);

      // Extract user from JWT token
      let userData = null;
      if (response.accessToken) {
        userData = extractUserFromJwt(response.accessToken);
      }

      if (!userData) {
        // Malformed token or invalid role - this should not happen from valid backend
        throw new Error('Invalid response from authentication server');
      }

      setUser(userData);
      setAccessToken(response.accessToken);
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  }, []);

  /**
   * Register - Real backend: registration succeeds then navigates to /login
   * Mock backend: auto-logs in after registration
   *
   * The RegisterPage handles navigation to login after successful registration.
   * For mock, we need to set the user so the session is established.
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await registerApi(userData);

      // Mock mode: registration auto-logs in
      if (response.user && response.accessToken) {
        setUser(response.user);
        setAccessToken(response.accessToken);
      }
      // Real mode: registrationResult is returned, user will login separately

      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    accessToken,
    role: user?.role,
    loading,
    isAuthenticated: !!user && !!accessToken,
    login,
    logout,
    register,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
