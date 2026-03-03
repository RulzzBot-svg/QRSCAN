import { API } from "./api";

export const getHospitals = () => API.get("/hospital/all");

export const getAHUsForHospital = (id)=> API.get(`/hospital/${id}/ahus`);

export const getHospitalAHUSummary = () => API.get(`/hospitals/ahus_summary`);

export const getBuildingsForHospital = (id) => API.get(`/hospital/${id}/buildings`);