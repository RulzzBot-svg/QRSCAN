import axios from "axios";
const API = "http://192.168.1.131:5000/api";

export function submitJob(data) {
  return axios.post(`${API}/jobs`, data);
}
