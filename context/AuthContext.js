// context/AuthContext.js - auth state and session helpers
import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { createLogger } from '../utils/logger';

export const AuthContext = createContext();
const log = createLogger('auth');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await AsyncStorage.getItem('token');
      log.debug('token encontrado:', Boolean(token));

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (error) {
      const status = error?.response?.status || null;
      if (status === 401) {
        log.info('loadUser sesion invalida');
      } else {
        log.error('loadUser error:', error);
      }
      await AsyncStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    await loadUser();
  }

  async function login(email, password) {
    try {
      const { data } = await api.post('/auth/login', { email, password });

      await AsyncStorage.setItem('token', data.token);
      setUser(data.user);
      log.info('login exitoso');

      return data.user;
    } catch (error) {
      log.error('login error:', error);
      throw error;
    }
  }

  async function register(name, email, password, role) {
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
      });

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        setUser(data.user || data.host || data);
      } else {
        setUser(null);
      }

      return data;
    } catch (error) {
      log.error('register error:', error);
      throw error;
    }
  }

  async function registerHost(name, email, password) {
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        setUser(data.user || data.host || data);
      } else {
        setUser(null);
      }

      return data;
    } catch (error) {
      log.error('registerHost error:', error);
      throw error;
    }
  }

  async function verifyEmail(email, otp) {
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        setUser(data.user);
      }

      return data;
    } catch (error) {
      log.error('verifyEmail error:', error);
      throw error;
    }
  }

  async function resendEmailOtp(email) {
    try {
      const { data } = await api.post('/auth/resend-email-otp', { email });
      return data;
    } catch (error) {
      log.error('resendEmailOtp error:', error);
      throw error;
    }
  }

  async function forgotPassword(email) {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    } catch (error) {
      log.error('forgotPassword error:', error);
      throw error;
    }
  }

  async function resetPassword(email, otp, newPassword) {
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        setUser(data.user);
      }

      return data;
    } catch (error) {
      log.error('resetPassword error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await AsyncStorage.removeItem('token');
      setUser(null);
      log.info('logout completado');
    } catch (error) {
      log.error('logout error:', error);
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    registerHost,
    verifyEmail,
    resendEmailOtp,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
