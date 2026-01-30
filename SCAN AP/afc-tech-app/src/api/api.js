import axios from "axios";


const rawBase = import.meta.env.VITE_API_BASE_URL;

const BASE = rawBase && rawBase.trim().length ? rawBase.trim(): "";


export const API = axios.create({

    //home API
    //baseURL: "/api",

    //work API
    //baseURL:"http://192.168.1.131:5000/api",

    baseURL: `${BASE}/api`,
});