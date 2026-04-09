import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(() => {
    // Charger le refresh token depuis localStorage (persiste après fermeture)
    return localStorage.getItem("refreshToken") || null;
  });
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshQueue = React.useRef([]);

  // Sauvegarder le refresh token dans localStorage
  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    } else {
      localStorage.removeItem("refreshToken");
    }
  }, [refreshToken]);

  // Mettre à jour l'header Authorization quand l'access token change
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [accessToken]);

  // Fonction pour rafraîchir l'access token
  const refreshAccessToken = useCallback(
    async (token) => {
      if (isRefreshing) {
        // Attendre que le refresh en cours se termine
        return new Promise((resolve, reject) => {
          refreshQueue.current.push({ resolve, reject });
        });
      }

      if (!token) {
        return Promise.reject(new Error("No refresh token available"));
      }

      setIsRefreshing(true);
      try {
        const response = await axios.post("/auth/refresh", {
          refreshToken: token,
        });
        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);

        // Résoudre toutes les requêtes en attente
        refreshQueue.current.forEach((req) => req.resolve(newAccessToken));
        refreshQueue.current = [];

        return newAccessToken;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        // Le refresh token est invalide, déconnecter l'utilisateur
        logout();

        // Rejeter toutes les requêtes en attente
        refreshQueue.current.forEach((req) => req.reject(error));
        refreshQueue.current = [];

        throw error;
      } finally {
        setIsRefreshing(false);
      }
    },
    [isRefreshing],
  );

  // Interceptor axios pour gérer l'expiration de l'access token
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Si 401 et pas déjà tenté de refresh, essayer de rafraîchir
        if (error.response?.status === 401 && !config._retry && refreshToken) {
          config._retry = true;
          try {
            const newAccessToken = await refreshAccessToken(refreshToken);
            config.headers["Authorization"] = `Bearer ${newAccessToken}`;
            return axios(config);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        // Si le refresh échoue aussi, rediriger vers login
        if (error.response?.status === 401) {
          logout();
          window.location.href = "/login";
        }

        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshToken, refreshAccessToken]);

  // Auto-refresh de l'access token avant expiration (14 minutes)
  useEffect(() => {
    if (!accessToken) return;

    // Décoder le token pour obtenir l'expiration
    try {
      const parts = accessToken.split(".");
      if (parts.length !== 3) return;

      const payload = JSON.parse(atob(parts[1]));
      const expiresAt = payload.exp * 1000; // En millisecondes
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Rafraîchir 1 minute avant l'expiration
      const timeout = Math.max(timeUntilExpiry - 60000, 1000);

      const timerId = setTimeout(() => {
        if (refreshToken) {
          refreshAccessToken(refreshToken).catch(console.error);
        }
      }, timeout);

      return () => clearTimeout(timerId);
    } catch (err) {
      console.error("Failed to parse access token:", err);
    }
  }, [accessToken, refreshToken, refreshAccessToken]);

  const login = async (matricule, password) => {
    try {
      const response = await axios.post("/auth/login", {
        matricule,
        password,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: userData,
      } = response.data;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);

      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    // Invalider le refresh token sur le serveur
    if (refreshToken) {
      axios
        .post("/auth/logout", { refreshToken })
        .catch((err) => console.error("Logout error:", err));
    }

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("refreshToken");
    delete axios.defaults.headers.common["Authorization"];
  }, [refreshToken]);

  // Cleanup automatique à la fermeture de la fenêtre/onglet
  // Le token reste tant que l'utilisateur utilise l'app
  // À la fermeture (navigateur ou Electron), la session est vérifiée
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Logout lors de la fermeture (sync fortement recommandé)
      if (refreshToken) {
        // Utiliser sendBeacon pour s'assurer que la requête est envoyée même lors de la fermeture
        navigator.sendBeacon("/auth/logout", JSON.stringify({ refreshToken }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        user,
        login,
        logout,
        isAuthenticated: !!accessToken && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
