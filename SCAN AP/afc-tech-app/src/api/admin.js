import { API } from "./api";


export const getAdminOverview = () =>{
    return API.get("/admin");
};