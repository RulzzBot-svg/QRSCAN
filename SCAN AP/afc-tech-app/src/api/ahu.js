import { API } from "./api";


export const getAHUbyQR = (ahu_id)=>API.get(`/qr/${ahu_id}`);