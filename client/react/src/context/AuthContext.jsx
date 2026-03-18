import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // Récupérer le token depuis localStorage à l'initialisation
    return localStorage.getItem("authToken") || null;
  });

  // Sauvegarder le token dans localStorage à chaque changement
  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [token]);

  const logout = () => {
    setToken(null);
    localStorage.removeItem("authToken");
  };

  // Configurer l'interceptor axios pour gérer les réponses 401
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Si le serveur renvoie 401 (token expiré), déconnecter l'utilisateur
        if (error.response?.status === 401) {
          logout();
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
