import { API } from "./api";

export const getHospitals = (params) => API.get("/hospital/all", { params });

export const getAHUsForHospital = (id)=> API.get(`/hospital/${id}/ahus`);

export const getBuildingsForHospital = (id) => API.get(`/hospital/${id}/buildings`);