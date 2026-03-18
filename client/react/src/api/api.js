import axios from "axios";

/**
 * Configuration de l'API
 * Utilise le .env pour la URL de développement
 * Pointe vers le même domaine que la page en production
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  window.location.origin.replace(":5173", ":3001");

// Timeout par défaut pour les requêtes API (30 secondes)
const API_TIMEOUT = 30000;

// Instance axios configurée avec timeout
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

/**
 * Helper pour obtenir les headers d'authentification
 */
function getAuthHeaders(token) {
  return {
    Authorization: "Bearer " + token,
  };
}

/**
 * POST /auth/login - Authentifier l'utilisateur
 */
export function loginRequest(matricule, password) {
  return axios.post(
    `${API_BASE_URL}/auth/login`,
    { matricule, password },
    {
      timeout: API_TIMEOUT,
    },
  );
}

/**
 * POST /reports - Créer un nouveau rapport
 */
export function createReport(data, token) {
  return apiClient.post("/reports", data, {
    headers: getAuthHeaders(token),
  });
}

/**
 * GET /reports - Rechercher des rapports (avec pagination et filtres)
 */
export function searchReports(params, token) {
  return apiClient.get("/reports", {
    params,
    headers: getAuthHeaders(token),
  });
}

/**
 * GET /reports/:id - Obtenir les détails d'un rapport
 */
export function getReport(id, token) {
  return apiClient.get(`/reports/${id}`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * PUT /reports/:id - Mettre à jour un rapport
 */
export function updateReport(id, data, token) {
  return apiClient.put(`/reports/${id}`, data, {
    headers: getAuthHeaders(token),
  });
}

/**
 * DELETE /reports/:id - Supprimer un rapport
 */
export function deleteReport(id, token) {
  return apiClient.delete(`/reports/:id`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * GET /reports/:id/pdf - Télécharger un rapport en PDF
 */
export function downloadPdf(id, token) {
  return apiClient.get(`/reports/${id}/pdf`, {
    headers: getAuthHeaders(token),
    responseType: "blob",
  });
}

/**
 * GET /audit - Obtenir les logs d'audit (admin uniquement)
 */
export function getAuditLogs(params, token) {
  return apiClient.get("/audit", {
    params,
    headers: getAuthHeaders(token),
  });
}
