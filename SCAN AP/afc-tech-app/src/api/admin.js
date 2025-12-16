import axios from "axios";


export const getAdminOverview = () =>{
    return axios.get("/admin");
};