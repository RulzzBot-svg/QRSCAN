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
