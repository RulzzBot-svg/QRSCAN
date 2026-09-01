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

export const importSurveyWorkbook = (file, { dryRun = true, hospitalId, sheet } = {}) => {
  const form = new FormData();
  form.append("file", file);
  form.append("dry_run", dryRun ? "true" : "false");
  if (hospitalId != null && hospitalId !== "") {
    form.append("hospital_id", String(hospitalId));
  }
  if (sheet) form.append("sheet", sheet);
  return API.post("/admin/surveys/import", form, { timeout: 180000 });
};
