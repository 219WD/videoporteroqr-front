import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BACKEND_URL } from './backend';
import { createLogger } from './logger';

export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
});
const log = createLogger('api');

// Interceptor para añadir token automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const guestToken = await AsyncStorage.getItem('guestToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (guestToken) {
        config.headers['x-guest-token'] = guestToken;
      }
    } catch (error) {
      log.warn('error getting token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    log.error('error:', error.response?.status, error.message);

    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
    }

    return Promise.reject(error);
  },
);
