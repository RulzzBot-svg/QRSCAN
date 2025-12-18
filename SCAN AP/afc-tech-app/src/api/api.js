import axios from "axios";


export const API = axios.create({

    //home API
    //baseURL: "/api",

    //work API
    //baseURL:"http://192.168.1.131:5000/api",

    baseURL: import.meta.env.VITE_API_BASE_URL + "/api",
});