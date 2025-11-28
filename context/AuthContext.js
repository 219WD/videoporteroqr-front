// context/AuthContext.js - VERSIÓN SIN NOTIFICACIONES PUSH
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("🔐 Token encontrado:", !!token);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (error) {
      console.log("🔐 Error en loadUser:", error);
      await AsyncStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      console.log("🔐 Login llamado con:", email);
      
      const { data } = await api.post("/auth/login", { email, password });

      await AsyncStorage.setItem("token", data.token);
      setUser(data.user);
      console.log("🔐 Login exitoso");

      return data.user;
    } catch (error) {
      console.error("🔐 Error en login:", error);
      throw error;
    }
  }

  async function register(name, email, password, role) {
    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });

      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
      }

      setUser(data.user || data);
      return data.user || data;

    } catch (error) {
      console.error("🔐 Error en register:", error);
      throw error;
    }
  }

  async function registerHost(name, email, password) {
    try {
      console.log("🔐 RegisterHost llamado:", email);
      
      const { data } = await api.post("/auth/register-host", {
        name,
        email,
        password,
      });

      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
      }

      const userData = data.host || data;
      setUser(userData);
      return userData;

    } catch (error) {
      console.error("🔐 Error en registerHost:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await AsyncStorage.removeItem("token");
      setUser(null);
      console.log("🔐 Logout completado");
    } catch (error) {
      console.error("🔐 Error en logout:", error);
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    registerHost,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}