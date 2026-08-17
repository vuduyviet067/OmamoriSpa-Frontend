import { createContext, useState, useCallback, useEffect } from 'react';
import { login as loginApi, register as registerApi } from '@/services/authService';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USER: 'omamori_user',
  TOKEN: 'omamori_accessToken',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedToken);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
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

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const response = await loginApi(username, password);
      setUser(response.user);
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

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await registerApi(userData);
      setUser(response.user);
      setAccessToken(response.accessToken);
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
