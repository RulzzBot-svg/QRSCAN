import axios from "axios";


export const API = axios.create({
    baseURL:"http://192.168.1.131:5000/api",
});