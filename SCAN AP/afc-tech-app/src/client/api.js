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

export function isClientDirector(user = readClientUser()) {
  const role = String(user?.role || "director").toLowerCase();
  return role !== "tech" && role !== "technician" && role !== "staff";
}

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
export const sendClientContact = (payload) => ClientAPI.post("/client/contact", payload);
export const getClientDatasheet = () => ClientAPI.get("/client/datasheet");

export function buildDatasheetFromAhus(hospital, details) {
  const groups = [];
  const index = new Map();
  for (const ahu of details || []) {
    const bname = ahu.building || "Unassigned";
    if (!index.has(bname)) {
      index.set(bname, groups.length);
      groups.push({ building: bname, units: [] });
    }
    groups[index.get(bname)].units.push({
      name: ahu.name,
      location: ahu.location,
      status: ahu.status,
      filters: (ahu.filters || []).map((f) => ({
        phase: f.phase,
        size: f.size,
        quantity: f.quantity,
        frequency_label: f.frequency_label,
      })),
    });
  }
  return {
    hospital: hospital?.name || hospital?.hospital || null,
    city: hospital?.city || null,
    buildings: groups,
  };
}

/** Load the equipment sheet even if /client/datasheet is not deployed yet. */
export async function loadClientDatasheet() {
  try {
    const res = await getClientDatasheet();
    if (Array.isArray(res.data?.buildings)) return res.data;
  } catch {
    /* older API without /client/datasheet */
  }
  let hospital = null;
  try {
    const hospitalRes = await getClientHospital();
    hospital = hospitalRes.data;
    if (Array.isArray(hospital?.datasheet?.buildings)) return hospital.datasheet;
  } catch {
    /* fall through to unit list */
  }
  const listRes = await getClientAhus();
  const list = Array.isArray(listRes.data) ? listRes.data : [];
  const details = [];
  for (let i = 0; i < list.length; i += 6) {
    const chunk = list.slice(i, i + 6);
    const rows = await Promise.all(
      chunk.map((a) => getClientAhu(a.id).then((r) => r.data).catch(() => a))
    );
    details.push(...rows);
  }
  return buildDatasheetFromAhus(hospital, details);
}

export function getPublicUnit(ahuId) {
  const id = String(ahuId ?? "").replace(/[^\d]/g, "");
  if (!id) {
    return Promise.reject({ response: { status: 404, data: { error: "Unit not found" } } });
  }
  return axios.get(`${BASE}/api/public/units/${id}`);
}
