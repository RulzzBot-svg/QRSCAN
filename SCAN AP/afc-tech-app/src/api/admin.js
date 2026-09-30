import { API } from "./api";

export const getAdminOverview = () => {
  return API.get("/admin");
};

export const getAdminHospitals = () => {
  return API.get("/admin/hospitals");
};

export const getHospitalSettings = (hospitalId) => {
  return API.get(`/admin/hospitals/${hospitalId}`);
};

export const updateHospitalSettings = (hospitalId, payload) => {
  return API.patch(`/admin/hospitals/${hospitalId}`, payload);
};

export const importSurveyWorkbook = (
  file,
  { dryRun = true, hospitalId, sheet, replaceExisting = false } = {}
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("dry_run", dryRun ? "true" : "false");
  if (hospitalId != null && hospitalId !== "") {
    form.append("hospital_id", String(hospitalId));
  }
  form.append("sheet", sheet || "all");
  if (replaceExisting) form.append("replace_existing", "true");
  return API.post("/admin/surveys/import", form, { timeout: 180000 });
};

export const deleteAdminAhu = (ahuId) => {
  return API.delete(`/admin/ahus/${ahuId}`);
};

export const deleteAdminAhus = (ids) => {
  return API.post("/admin/ahus/bulk-delete", { ids });
};

export const getHospitalClients = (hospitalId) => {
  return API.get(`/admin/hospitals/${hospitalId}/clients`);
};

export const createHospitalClient = (hospitalId, payload) => {
  return API.post(`/admin/hospitals/${hospitalId}/clients`, payload);
};

export const updateHospitalClient = (clientId, payload) => {
  return API.patch(`/admin/clients/${clientId}`, payload);
};

const FILTERS_CHUNK = 100;

export async function fetchFiltersByAhuIds(ahuIds, { includeInactive = true } = {}) {
  const ids = [...new Set((ahuIds || []).map((id) => String(id)).filter(Boolean))];
  if (!ids.length) return {};

  const out = {};
  for (let i = 0; i < ids.length; i += FILTERS_CHUNK) {
    const chunk = ids.slice(i, i + FILTERS_CHUNK);
    const res = await API.get("/admin/filters", {
      params: {
        ahu_ids: chunk.join(","),
        include_inactive: includeInactive ? 1 : 0,
      },
    });
    const map = res.data?.filters_by_ahu || {};
    for (const id of chunk) {
      const rows = map[id] ?? map[Number(id)];
      out[id] = Array.isArray(rows) ? rows : [];
    }
  }
  return out;
}
