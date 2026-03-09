import { API } from "./api";

export const getHospitals = () => API.get("/hospital/all");

export const getAHUsForHospital = (id)=> API.get(`/hospital/${id}/ahus`);

export const getBuildingsForHospital = (id) => API.get(`/hospital/${id}/buildings`);