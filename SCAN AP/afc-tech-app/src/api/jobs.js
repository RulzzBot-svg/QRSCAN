import axios from "axios";
import { API } from "./api";


//work API
//const API = "http://192.168.1.131:5000/api";

export function submitJob(data) {
  return axios.post(`${API}/jobs`, data);
}
