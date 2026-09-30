import axios from "axios";

const rawBase = import.meta.env.VITE_API_BASE_URL;
const BASE = rawBase && rawBase.trim().length ? rawBase.trim() : "";

export const CLIENT_TOKEN_KEY = "client_token";
export const CLIENT_USER_KEY = "client_user";

export const ClientAPI = axios.create({
  baseURL: `${BASE}/api`,
});

ClientAPI.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(CLIENT_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  return config;
});

ClientAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearClientSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/client/login")) {
        window.location.assign("/client/login");
      }
    }
    return Promise.reject(error);
  }
);

export function readClientUser() {
  try {
    const raw = localStorage.getItem(CLIENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasClientToken() {
  try {
    return Boolean(localStorage.getItem(CLIENT_TOKEN_KEY));
  } catch {
    return false;
  }
}

export function saveClientSession(payload) {
  const { token, ...user } = payload || {};
  if (token) localStorage.setItem(CLIENT_TOKEN_KEY, token);
  localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
}

export function clearClientSession() {
  try {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_USER_KEY);
  } catch {
    /* ignore */
  }
}

export const loginClient = (username, pin) =>
  ClientAPI.post("/client/login", { username, pin });

export const getClientMe = () => ClientAPI.get("/client/me");
export const getClientHospital = () => ClientAPI.get("/client/hospital");
export const getClientAhus = () => ClientAPI.get("/client/ahus");
export const getClientAhu = (id) => ClientAPI.get(`/client/ahus/${id}`);
export const getClientGraphs = () => ClientAPI.get("/client/graphs");
