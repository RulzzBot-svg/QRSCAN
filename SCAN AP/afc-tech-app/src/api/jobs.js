import { API } from "./api";


export const submitJob = (payload) => API.post("/jobs", payload);