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

// Add request interceptor to include tech ID in headers for admin routes
API.interceptors.request.use(
    (config) => {
        // Only add tech ID header for admin routes
        if (config.url && config.url.includes('/admin')) {
            try {
                const tech = JSON.parse(localStorage.getItem("tech"));
                if (tech && tech.id) {
                    config.headers['X-Tech-ID'] = tech.id;
                }
            } catch (e) {
                console.error("Error adding tech ID to request:", e);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);