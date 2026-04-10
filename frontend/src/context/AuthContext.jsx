import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const API_BASE = '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef(null);

  const logout = () => {
    localStorage.removeItem('nom_token');
    localStorage.removeItem('nom_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Keep logoutRef current so the interceptor always calls latest logout
  logoutRef.current = logout;

  useEffect(() => {
    const token = localStorage.getItem('nom_token');
    const stored = localStorage.getItem('nom_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {
        localStorage.removeItem('nom_token');
        localStorage.removeItem('nom_user');
      }
    }
    setLoading(false);

    // Intercept 401 responses — auto-logout when token expires
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logoutRef.current();
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const _persist = (token, userData) => {
    localStorage.setItem('nom_token', token);
    localStorage.setItem('nom_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { token, ...userData } = res.data;
    _persist(token, userData);
    return userData;
  };

  const signup = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/signup`, { email, password });
    const { token, ...userData } = res.data;
    _persist(token, userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
