import axios from "axios";

const rawBase = import.meta.env.VITE_API_BASE_URL;

const BASE = rawBase && rawBase.trim().length ? rawBase.trim() : "";

export const API = axios.create({
  baseURL: `${BASE}/api`,
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    if (status === 401) {
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

    const method = String(config.method || "get").toLowerCase();
    const retryCount = config.__retryCount || 0;
    const canRetry429 =
      status === 429 &&
      (method === "get" || method === "head") &&
      retryCount < 4;
    if (canRetry429) {
      config.__retryCount = retryCount + 1;
      const retryAfter = error.response?.headers?.["retry-after"];
      const parsed = retryAfter != null ? Number(retryAfter) : NaN;
      const delayMs =
        Number.isFinite(parsed) && parsed >= 0
          ? parsed * 1000
          : Math.min(8000, 400 * 2 ** retryCount);
      await wait(delayMs);
      return API(config);
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
