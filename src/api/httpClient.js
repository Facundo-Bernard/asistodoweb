import axios from "axios";

const TOKEN_KEY = "coopyaAccessToken";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const API_URIS = Object.freeze({
  auth: {
    login: "/api/v1/auth/login",
    me: "/api/v1/auth/me",
  },
  candidates: {
    collection: "/api/v1/candidatos",
    byId: (id) => `/api/v1/candidatos/${id}`,
  },
});

const httpClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const saveAccessToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearAccessToken = () => localStorage.removeItem(TOKEN_KEY);
export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export default httpClient;
