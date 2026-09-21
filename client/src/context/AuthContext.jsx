import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginUser = async (email, password) => {
    setError(null);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return res.data; // returns { requiresOtp: true, email }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOtpUser = async (email, otpCode) => {
    setError(null);
    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otpCode }),
      });
      setUser(res.data);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resendOtpCode = async () => {
    try {
      const res = await apiFetch('/api/auth/resend-otp', { method: 'POST' });
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const registerUser = async (name, email, password) => {
    setError(null);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logoutUser = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login: loginUser,
        verifyOtp: verifyOtpUser,
        resendOtp: resendOtpCode,
        register: registerUser,
        logout: logoutUser,
        refetchUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
