import { createContext, useState, useCallback, useEffect } from 'react';
import { login as loginApi, register as registerApi, parseTokenSession } from '@/services/authService';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USER: 'omamori_user',
  TOKEN: 'omamori_accessToken',
};

// In Phase 1 the backend login only returns a JWT. That JWT carries sub + scope
// which is enough to identify the user and their role, but NOT their profile
// fields (fullName, email, phone, avatar). Profile integration will fill
// these in later. We still preserve the previously persisted user object when
// it exists so the UI greeting does not regress during this phase.
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount.
  // Mock mode: hydrate the previously persisted user object directly.
  // Real mode: build the minimal session from the JWT (sub + scope) and
  // merge any previously persisted user so the UI does not lose greeting data.
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUserRaw = localStorage.getItem(STORAGE_KEYS.USER);
    const storedUser = storedUserRaw ? safeParse(storedUserRaw) : null;

    const useMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

    if (!storedToken) {
      setLoading(false);
      return;
    }

    if (useMock) {
      if (storedUser) {
        setUser(storedUser);
        setAccessToken(storedToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      setLoading(false);
      return;
    }

    // Real mode: parse JWT to obtain userId + role.
    const session = parseTokenSession(storedToken);
    if (!session || session.expired) {
      // Invalid or expired token — clear session, do NOT fall back to mock.
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setLoading(false);
      return;
    }

    // Merge the previously persisted user so the UI greeting keeps working
    // until the profile endpoint is integrated. Anything that the JWT
    // authoritative knows (id, role) wins over the stored copy.
    const merged = {
      ...(storedUser || {}),
      ...session.user,
      // Preserve original identity fields if they were set in a previous session.
      name: storedUser?.name ?? session.user.name,
      email: storedUser?.email ?? session.user.email,
      username: storedUser?.username ?? session.user.username,
      phone: storedUser?.phone ?? session.user.phone,
    };

    setUser(merged);
    setAccessToken(storedToken);
    setLoading(false);
  }, []);

  // Save to localStorage when user/token changes.
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
      // Backend register does NOT return a token. Do not auto-login after
      // register — the existing flow redirects to /login manually.
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
