import axios from "axios";

const rawBase = import.meta.env.VITE_API_BASE_URL;

const BASE = rawBase && rawBase.trim().length ? rawBase.trim() : "";

export const API = axios.create({
  baseURL: `${BASE}/api`,
});

API.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error attaching auth token:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("tech");
      } catch (e) {
        /* ignore */
      }
      if (typeof window !== "undefined" && !window.location.pathname.match(/^\/$/)) {
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    return Promise.reject(error);
  }
);

export function hasAuthToken() {
  try {
    return Boolean(localStorage.getItem("auth_token"));
  } catch {
    return false;
  }
}
