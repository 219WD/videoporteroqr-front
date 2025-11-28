// utils/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://videoporteroqr-back.onrender.com',
  timeout: 10000,
});

// Interceptor para añadir token automáticamente
api.interceptors.request.use(
  async (config) => {
    try {
      // ✅ Usar AsyncStorage en lugar de localStorage
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Opcional: Interceptor para respuestas
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('❌ API Error:', error.response?.status, error.message);
    
    // Si el token es inválido, limpiarlo
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);